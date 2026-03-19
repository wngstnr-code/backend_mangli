import { supabase } from '../../config/supabase';
import { AdminNotification, CreateAdminNotificationDTO } from '../../types/admin-notification.types';
import { AppError } from '../../middlewares/error-handler';

const TABLE = 'admin_notifications';

export class AdminNotificationService {
  async create(dto: CreateAdminNotificationDTO): Promise<AdminNotification> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        type: dto.type || 'new_order',
        title: dto.title,
        message: dto.message,
        order_id: dto.order_id || null,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as AdminNotification;
  }

  async getAll(params: {
    page?: number;
    limit?: number;
    is_read?: boolean;
  }): Promise<{ data: AdminNotification[]; count: number }> {
    const { page = 1, limit = 20, is_read } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read);
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return { data: data as AdminNotification[], count: count || 0 };
  }

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) throw new AppError(error.message, 500);

    return count || 0;
  }

  async markAsRead(id: string): Promise<AdminNotification> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    if (!data) throw new AppError('Notifikasi tidak ditemukan', 404);

    return data as AdminNotification;
  }

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('is_read', false)
      .select();

    if (error) throw new AppError(error.message, 500);

    return {
      message: 'Semua notifikasi telah dibaca',
      count: data?.length || 0,
    };
  }

  async notifyNewOrder(orderNumber: string, fullName: string, totalAmount: number, orderId: string): Promise<void> {
    const formatCurrency = (amount: number): string =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    await this.create({
      type: 'new_order',
      title: `Order Baru #${orderNumber}`,
      message: `${fullName} membuat pesanan baru senilai ${formatCurrency(totalAmount)}`,
      order_id: orderId,
    });
  }

  async notifyPaymentReceived(orderNumber: string, totalAmount: number, orderId: string, provider: string): Promise<void> {
    const formatCurrency = (amount: number): string =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    await this.create({
      type: 'payment_received',
      title: `Pembayaran Diterima #${orderNumber}`,
      message: `Pembayaran senilai ${formatCurrency(totalAmount)} via ${provider.toUpperCase()} telah diterima.`,
      order_id: orderId,
    });
  }
}

export const adminNotificationService = new AdminNotificationService();
