import { supabase } from '../../config/supabase';
import { transporter, SMTP_FROM } from '../../config/mailer';
import { AppError } from '../../middlewares/error-handler';
import { generateInvoiceHTML } from '../../utils/invoice-template';

const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';
const PAYMENTS_TABLE = 'payments';

export class InvoiceService {
  /**
   * Send invoice email for an order
   */
  async sendInvoice(orderId: string, toEmail?: string): Promise<{ message: string; to: string }> {
    // Get order
    const { data: order, error: orderError } = await supabase
      .from(ORDERS_TABLE)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new AppError('Order tidak ditemukan', 404);

    // Get order items with tour package info
    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('*, tour_packages(name)')
      .eq('order_id', orderId);

    // Get latest payment info
    const { data: payment } = await supabase
      .from(PAYMENTS_TABLE)
      .select('payment_type, status, paid_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const recipientEmail = toEmail || order.email;

    if (!recipientEmail) {
      throw new AppError('Email penerima tidak ditemukan', 400);
    }

    // Generate HTML
    const html = generateInvoiceHTML(order, items || [], payment);

    // Send email
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: recipientEmail,
        subject: `Invoice #${order.order_number} - Mangli Travel`,
        html,
      });
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      throw new AppError('Gagal mengirim email invoice. Periksa konfigurasi SMTP.', 500);
    }

    return {
      message: 'Invoice berhasil dikirim',
      to: recipientEmail,
    };
  }
}

export const invoiceService = new InvoiceService();
