import { supabase } from '../../config/supabase';
import { transporter, SMTP_FROM } from '../../config/mailer';
import { AppError } from '../../middlewares/error-handler';
import { generateInvoiceHTML } from '../../utils/invoice-template';

const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';
const PAYMENTS_TABLE = 'payments';

export class InvoiceService {
  async sendInvoice(orderId: string, toEmail?: string): Promise<{ message: string; to: string }> {
    const { data: order, error: orderError } = await supabase
      .from(ORDERS_TABLE)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new AppError('Order tidak ditemukan', 404);

    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('*, tour_packages(name)')
      .eq('order_id', orderId);

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

    const html = generateInvoiceHTML(order, items || [], payment);

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
