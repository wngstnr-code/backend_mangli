import { supabase } from '../../config/supabase';
import { snap } from '../../config/midtrans';
import { Payment, CreateCashPaymentDTO, MidtransNotificationPayload } from '../../types/payment.types';
import { AppError } from '../../middlewares/error-handler';
import { orderService } from '../order/order.service';
import { adminNotificationService } from '../admin-notification/admin-notification.service';
import { ticketService } from '../ticket/ticket.service';
import { invoiceService } from '../invoice/invoice.service';

const TABLE = 'payments';

export class PaymentService {

  async createMidtransPayment(orderId: string): Promise<Payment> {
    const order = await orderService.getById(orderId);

    if (order.status !== 'pending') {
      throw new AppError('Order sudah tidak bisa dibayar', 400);
    }


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


    if (existingPayment && existingPayment.snap_token) {
      return existingPayment as Payment;
    }


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

  async createCashPayment(orderId: string, dto: CreateCashPaymentDTO, adminId: string): Promise<Payment> {
    const order = await orderService.getById(orderId);

    if (order.status !== 'pending') {
      throw new AppError('Order sudah tidak bisa dibayar', 400);
    }

    if (Number(dto.amount) < Number(order.total_amount)) {
      throw new AppError(`Uang yang dibayarkan kurang. Total tagihan: Rp ${order.total_amount.toLocaleString('id-ID')}`, 400);
    }

    if (Number(dto.amount) > Number(order.total_amount)) {
      throw new AppError(`Uang yang dibayarkan berlebih. Silakan masukkan nominal pas (Rp ${order.total_amount.toLocaleString('id-ID')})`, 400);
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
        received_by: adminId,
        receipt_number: dto.receipt_number || null,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    await orderService.updateStatus(orderId, { status: 'paid' });

    adminNotificationService
      .notifyPaymentReceived(order.order_number, dto.amount, orderId, 'cash')
      .catch((err) => console.error('Failed to send admin notification:', err));

    invoiceService.sendInvoice(orderId).catch(err => console.error('Auto invoice failed:', err));

    return payment as Payment;
  }

  async handleNotification(payload: MidtransNotificationPayload): Promise<Payment> {
    const { order_id, transaction_status, payment_type, transaction_id, fraud_status } = payload;

    const { data: payment, error: findError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('gateway_order_id', order_id)
      .single();

    if (findError || !payment) throw new AppError('Payment tidak ditemukan', 404);

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

    const vaNumber = payload.va_numbers?.[0]?.va_number || null;

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

    await orderService.updateStatus(payment.order_id, { status: orderStatus });

    if (status === 'settlement') {
      const order = await orderService.getById(payment.order_id);
      adminNotificationService
        .notifyPaymentReceived(order.order_number, Number(order.total_amount), payment.order_id, 'midtrans')
        .catch((err) => console.error('Failed to send admin notification:', err));
        
      invoiceService.sendInvoice(payment.order_id).catch(err => console.error('Auto invoice failed:', err));
      ticketService.sendTicketEmail(payment.order_id).catch(err => console.error('Auto ticket failed:', err));
    }

    return updated as Payment;
  }

  async getByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    return data as Payment[];
  }

  async getById(id: string): Promise<Payment> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Payment tidak ditemukan', 404);

    return data as Payment;
  }

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
