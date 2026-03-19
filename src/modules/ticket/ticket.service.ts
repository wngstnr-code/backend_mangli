import QRCode from 'qrcode';
import { supabase } from '../../config/supabase';
import { transporter, SMTP_FROM } from '../../config/mailer';
import { AppError } from '../../middlewares/error-handler';
import { generateTicketHTML } from '../../utils/ticket-template';

const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';

export class TicketService {
  /**
   * Get ticket HTML string and QR code data
   */
  async getTicketData(orderId: string, isEmail: boolean = false, qrCid?: string): Promise<{ html: string, qrCodeDataURL: string, qrBuffer: Buffer }> {
    // Get order
    const { data: order, error: orderError } = await supabase
      .from(ORDERS_TABLE)
      .select('id, order_number, full_name, email, visit_date, status, total_amount, payment_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppError('Order tidak ditemukan', 404);
    }

    // Tickets are available for 'paid' or 'confirmed' orders.
    // Also allowed for 'pending' orders if payment_method is 'cash' (per user requirement).
    if (!['paid', 'confirmed'].includes(order.status)) {
      if (order.payment_method !== 'cash') {
        throw new AppError('Tiket hanya tersedia untuk pesanan yang sudah dibayar', 400);
      }
    }

    // Get order items
    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('quantity, tour_packages(name)')
      .eq('order_id', orderId);

    // Generate QR Code containing the order_id (can be scanned by admin)
    // We use a JSON string or just the order_id. Using order_id is simpler for DB lookup.
    const qrData = JSON.stringify({ order_id: order.id });
    
    // Generate QR Code data URL (for browser) and Buffer (for email)
    const qrOptions = {
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData, qrOptions);
    const qrBuffer = await QRCode.toBuffer(qrData, qrOptions);

    const formattedItems = (items || []).map((item: any) => ({
      quantity: item.quantity,
      tour_packages: {
        name: Array.isArray(item.tour_packages) ? item.tour_packages[0]?.name : item.tour_packages?.name
      }
    }));

    // Generate HTML
    const html = generateTicketHTML(order as any, formattedItems, qrCodeDataURL, isEmail, qrCid);
    return { html, qrCodeDataURL, qrBuffer };
  }

  /**
   * Legacy method for compatibility
   */
  async getTicketHTML(orderId: string): Promise<{ html: string }> {
    const { html } = await this.getTicketData(orderId, false);
    return { html };
  }

  /**
   * Send ticket email to customer
   */
  async sendTicketEmail(orderId: string, toEmail?: string): Promise<{ message: string; to: string }> {
    const { data: order, error: orderError } = await supabase
      .from(ORDERS_TABLE)
      .select('order_number, email')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new AppError('Order tidak ditemukan', 404);

    const recipientEmail = toEmail || order.email;

    if (!recipientEmail) {
      throw new AppError('Email penerima tidak ditemukan', 400);
    }

    const qrCid = `qr-${order.order_number}@mangli.travel`;
    const { html, qrBuffer } = await this.getTicketData(orderId, true, qrCid);

    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: recipientEmail,
        subject: `E-Ticket Pesanan #${order.order_number} - Mangli Travel`,
        html,
        attachments: [
          {
            filename: 'qrcode.png',
            content: qrBuffer,
            cid: qrCid, // Must match the HTML exactly
            contentType: 'image/png',
            contentDisposition: 'inline'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send ticket email:', error);
      throw new AppError('Gagal mengirim email tiket. Periksa konfigurasi SMTP.', 500);
    }

    return {
      message: 'Tiket berhasil dikirim',
      to: recipientEmail,
    };
  }
}

export const ticketService = new TicketService();
