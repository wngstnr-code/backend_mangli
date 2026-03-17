import { supabase } from '../../config/supabase';
import { snap } from '../../config/midtrans';
import { Payment, CreateCashPaymentDTO, MidtransNotificationPayload } from '../../types/payment.types';
import { AppError } from '../../middlewares/error-handler';
import { orderService } from '../order/order.service';
import { adminNotificationService } from '../admin-notification/admin-notification.service';

const TABLE = 'payments';

export class PaymentService {
  /**
   * Create a Midtrans Snap payment
   */
  async createMidtransPayment(orderId: string): Promise<Payment> {
    const order = await orderService.getById(orderId);

    if (order.status !== 'pending') {
      throw new AppError('Order sudah tidak bisa dibayar', 400);
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId)
      .eq('gateway_provider', 'midtrans')
      .in('status', ['pending', 'settlement'])
      .single();

    if (existingPayment && existingPayment.status === 'settlement') {
      throw new AppError('Order sudah dibayar', 400);
    }

    // If there's a pending midtrans payment, return the existing snap token
    if (existingPayment && existingPayment.snap_token) {
      return existingPayment as Payment;
    }

    // Create Midtrans Snap transaction
    const parameter = {
      transaction_details: {
        order_id: order.order_number,
        gross_amount: Number(order.total_amount),
      },
      customer_details: {
        first_name: order.full_name,
        email: order.email,
        phone: order.phone_number,
      },
      callbacks: {
        finish: process.env.MIDTRANS_FINISH_REDIRECT_URL || 'https://example.com/finish',
      },
    };

    const midtransResponse = await snap.createTransaction(parameter);

    // Set payment expiry 24 hours from now
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    const { data: payment, error } = await supabase
      .from(TABLE)
      .insert({
        order_id: orderId,
        gateway_provider: 'midtrans',
        gateway_order_id: order.order_number,
        status: 'pending',
        amount: order.total_amount,
        currency: 'IDR',
        redirect_url: midtransResponse.redirect_url,
        snap_token: midtransResponse.token,
        gateway_response: midtransResponse,
        expired_at: expiredAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return payment as Payment;
  }

  /**
   * Create a cash payment (for walk-in / on-site payment)
   */
  async createCashPayment(orderId: string, dto: CreateCashPaymentDTO): Promise<Payment> {
    const order = await orderService.getById(orderId);

    if (order.status !== 'pending') {
      throw new AppError('Order sudah tidak bisa dibayar', 400);
    }

    const { data: payment, error } = await supabase
      .from(TABLE)
      .insert({
        order_id: orderId,
        gateway_provider: 'cash',
        gateway_order_id: order.order_number,
        payment_type: 'cash',
        payment_channel: dto.payment_channel || 'counter',
        status: 'settlement',
        amount: dto.amount,
        currency: 'IDR',
        received_by: dto.received_by || null,
        receipt_number: dto.receipt_number || null,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Update order status to paid
    await orderService.updateStatus(orderId, { status: 'paid' });

    // Send admin notification
    adminNotificationService
      .notifyPaymentReceived(order.order_number, dto.amount, orderId, 'cash')
      .catch((err) => console.error('Failed to send admin notification:', err));

    return payment as Payment;
  }

  /**
   * Handle Midtrans notification webhook
   */
  async handleNotification(payload: MidtransNotificationPayload): Promise<Payment> {
    const { order_id, transaction_status, payment_type, transaction_id, fraud_status } = payload;

    // Find payment by gateway_order_id
    const { data: payment, error: findError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('gateway_order_id', order_id)
      .single();

    if (findError || !payment) throw new AppError('Payment tidak ditemukan', 404);

    // Determine status
    let status = 'pending';
    let orderStatus = 'pending';

    if (transaction_status === 'capture') {
      status = fraud_status === 'accept' ? 'settlement' : 'challenge';
      orderStatus = fraud_status === 'accept' ? 'paid' : 'pending';
    } else if (transaction_status === 'settlement') {
      status = 'settlement';
      orderStatus = 'paid';
    } else if (['cancel', 'deny'].includes(transaction_status)) {
      status = 'failed';
      orderStatus = 'failed';
    } else if (transaction_status === 'expire') {
      status = 'expire';
      orderStatus = 'failed';
    } else if (transaction_status === 'pending') {
      status = 'pending';
      orderStatus = 'pending';
    }

    // Extract VA number if exists
    const vaNumber = payload.va_numbers?.[0]?.va_number || null;

    // Update payment
    const updateData: Record<string, unknown> = {
      gateway_transaction_id: transaction_id,
      payment_type,
      status,
      gateway_response: payload,
      va_number: vaNumber,
      payment_code: payload.payment_code || null,
      updated_at: new Date().toISOString(),
    };

    if (status === 'settlement') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message, 500);

    // Update order status
    await orderService.updateStatus(payment.order_id, { status: orderStatus });

    // Send admin notification if payment is successful
    if (status === 'settlement') {
      // Get order details for order number and total amount
      const order = await orderService.getById(payment.order_id);
      adminNotificationService
        .notifyPaymentReceived(order.order_number, Number(order.total_amount), payment.order_id, 'midtrans')
        .catch((err) => console.error('Failed to send admin notification:', err));
    }

    return updated as Payment;
  }

  /**
   * Get payment by order ID
   */
  async getByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    return data as Payment[];
  }

  /**
   * Get payment by ID
   */
  async getById(id: string): Promise<Payment> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Payment tidak ditemukan', 404);

    return data as Payment;
  }

  /**
   * Get all payments with pagination
   */
  async getAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    gateway_provider?: string;
  }): Promise<{ data: Payment[]; count: number }> {
    const { page = 1, limit = 10, status, gateway_provider } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE)
      .select('*, orders(order_number, full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (gateway_provider) {
      query = query.eq('gateway_provider', gateway_provider);
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return { data: data as Payment[], count: count || 0 };
  }
}

export const paymentService = new PaymentService();
