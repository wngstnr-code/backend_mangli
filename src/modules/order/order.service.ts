import { supabase } from '../../config/supabase';
import { CreateOrderDTO, Order, UpdateOrderStatusDTO } from '../../types/order.types';
import { AppError } from '../../middlewares/error-handler';
import { generateOrderNumber } from '../../utils/generate-order-number';
import { tourPackageService } from '../tour-package/tour-package.service';
import { adminNotificationService } from '../admin-notification/admin-notification.service';
import { ticketService } from '../ticket/ticket.service';

const TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';

export class OrderService {
  async create(dto: CreateOrderDTO): Promise<Order & { items: unknown[] }> {
    const { items, ...orderData } = dto;

    if (!items || items.length === 0) {
      throw new AppError('Minimal satu item harus ditambahkan', 400);
    }

    const allowedPaymentMethods = ['midtrans', 'cash'];
    const paymentMethod = orderData.payment_method || 'midtrans';
    
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw new AppError('Metode pembayaran tidak valid. Gunakan "midtrans" atau "cash".', 400);
    }

    let totalAmount = 0;
    const itemDetails = [];

    for (const item of items) {
      const tourPackage = await tourPackageService.getById(item.tour_package_id);

      if (!tourPackage.is_active) {
        throw new AppError(`Paket "${tourPackage.name}" sedang tidak aktif`, 400);
      }

      const visitDate = new Date(orderData.visit_date);
      const dayOfWeek = visitDate.getDay();

      if (tourPackage.available_days && !tourPackage.available_days.includes(dayOfWeek)) {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        throw new AppError(
          `Paket "${tourPackage.name}" tidak tersedia di hari ${dayNames[dayOfWeek]}`,
          400
        );
      }

      const visitDateStr = orderData.visit_date;
      if (tourPackage.blocked_dates && tourPackage.blocked_dates.includes(visitDateStr)) {
        throw new AppError(
          `Paket "${tourPackage.name}" tidak tersedia pada tanggal ${visitDateStr}`,
          400
        );
      }

      const { data: bookedData } = await supabase
        .from('order_items')
        .select('quantity, orders!inner(visit_date, status)')
        .eq('tour_package_id', item.tour_package_id)
        .eq('orders.visit_date', orderData.visit_date)
        .in('orders.status', ['pending', 'paid']);

      const totalBooked = bookedData?.reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0) || 0;

      if (totalBooked + item.quantity > tourPackage.max_participants) {
        const remaining = tourPackage.max_participants - totalBooked;
        throw new AppError(
          `Kuota paket "${tourPackage.name}" pada tanggal ${visitDateStr} tidak mencukupi. Sisa kuota: ${remaining} orang.`,
          400
        );
      }

      const unitPrice = tourPackage.discount_price || tourPackage.price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      itemDetails.push({
        tour_package_id: item.tour_package_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    const orderNumber = generateOrderNumber();

    let expiredAt: Date;
    if (paymentMethod === 'cash') {
      expiredAt = new Date(`${orderData.visit_date}T23:59:59+07:00`);
    } else {
      expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 24);
    }

    const { data: order, error: orderError } = await supabase
      .from(TABLE)
      .insert({
        ...orderData,
        order_number: orderNumber,
        payment_method: paymentMethod,
        visit_date: orderData.visit_date,
        status: 'pending',
        total_amount: totalAmount,
        expired_at: expiredAt.toISOString(),
      })
      .select()
      .single();

    if (orderError) throw new AppError(orderError.message, 500);

    const orderItems = itemDetails.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .insert(orderItems)
      .select();

    if (itemsError) throw new AppError(itemsError.message, 500);

    adminNotificationService
      .notifyNewOrder(orderNumber, orderData.full_name, totalAmount, order.id)
      .catch((err) => console.error('Failed to send admin notification:', err));
    if (paymentMethod === 'cash') {
      ticketService.sendTicketEmail(order.id).catch((err) => console.error('Failed to send auto-ticket for cash order:', err));
    }

    return { ...(order as Order), items: insertedItems || [] };
  }

  async getAll(params: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ data: Order[]; count: number }> {
    const { page = 1, limit = 10, status } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return { data: data as Order[], count: count || 0 };
  }

  async getById(id: string): Promise<Order & { items: unknown[] }> {
    const { data: order, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) throw new AppError('Order tidak ditemukan', 404);

    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('*, tour_packages(*)')
      .eq('order_id', id);

    return { ...(order as Order), items: items || [] };
  }

  async getByOrderNumber(orderNumber: string): Promise<Order & { items: unknown[] }> {
    const { data: order, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error || !order) throw new AppError('Order tidak ditemukan', 404);

    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('*, tour_packages(*)')
      .eq('order_id', order.id);

    return { ...(order as Order), items: items || [] };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDTO): Promise<Order> {
    await this.getById(id);

    const updateData: Record<string, unknown> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };

    if (dto.admin_notes !== undefined) {
      updateData.admin_notes = dto.admin_notes;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as Order;
  }

  async cancelOrder(id: string): Promise<Order> {
    const order = await this.getById(id);

    if (order.status !== 'pending') {
      throw new AppError(`Order tidak bisa dibatalkan karena statusnya sudah "${order.status}"`, 400);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as Order;
  }

  async expireOverdueOrders(): Promise<{ expired_count: number }> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'expired',
        updated_at: now,
      })
      .eq('status', 'pending')
      .lt('expired_at', now)
      .select('id');

    if (error) throw new AppError(error.message, 500);

    return { expired_count: data?.length || 0 };
  }
}

export const orderService = new OrderService();
