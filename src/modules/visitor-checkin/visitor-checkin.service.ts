import { supabase } from '../../config/supabase';
import { CreateVisitorCheckinDTO, VisitorCheckin, VisitorCheckinSummary } from '../../types/visitor-checkin.types';
import { AppError } from '../../middlewares/error-handler';

const TABLE = 'visitor_checkins';
const ORDERS_TABLE = 'orders';

export class VisitorCheckinService {
  /**
   * Record a visitor check-in for an order
   */
  async checkin(dto: CreateVisitorCheckinDTO): Promise<VisitorCheckin> {
    // Validate order exists and is paid/confirmed
    const { data: order, error: orderError } = await supabase
      .from(ORDERS_TABLE)
      .select('id, status, order_number')
      .eq('id', dto.order_id)
      .single();

    if (orderError || !order) {
      throw new AppError('Order tidak ditemukan', 404);
    }

    if (!['paid', 'confirmed'].includes(order.status)) {
      throw new AppError(
        `Order #${order.order_number} belum dibayar (status: ${order.status})`,
        400
      );
    }

    // Check if already checked in
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('order_id', dto.order_id)
      .single();

    if (existing) {
      throw new AppError('Order ini sudah di-check-in sebelumnya', 409);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        order_id: dto.order_id,
        checked_in_by: dto.checked_in_by || null,
        number_of_visitors: dto.number_of_visitors,
        notes: dto.notes || null,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as VisitorCheckin;
  }

  /**
   * Get check-in status for a specific order
   */
  async getByOrderId(orderId: string): Promise<VisitorCheckin | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 500);
    }

    return (data as VisitorCheckin) || null;
  }

  /**
   * Get all check-ins with pagination and date filter
   */
  async getAll(params: {
    page?: number;
    limit?: number;
    date?: string; // YYYY-MM-DD
  }): Promise<{ data: VisitorCheckin[]; count: number }> {
    const { page = 1, limit = 10, date } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE)
      .select('*, orders(order_number, full_name, phone_number, email)', { count: 'exact' })
      .order('checked_in_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (date) {
      // Filter by date (start of day to end of day)
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('checked_in_at', startOfDay).lte('checked_in_at', endOfDay);
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return { data: data as VisitorCheckin[], count: count || 0 };
  }

  /**
   * Get summary statistics for a specific date (or today)
   */
  async getSummary(date?: string): Promise<VisitorCheckinSummary> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from(TABLE)
      .select('number_of_visitors')
      .gte('checked_in_at', startOfDay)
      .lte('checked_in_at', endOfDay);

    if (error) throw new AppError(error.message, 500);

    const totalCheckins = data?.length || 0;
    const totalVisitors = data?.reduce((sum, row) => sum + (row.number_of_visitors || 0), 0) || 0;

    return {
      date: targetDate,
      total_checkins: totalCheckins,
      total_visitors: totalVisitors,
    };
  }
}

export const visitorCheckinService = new VisitorCheckinService();
