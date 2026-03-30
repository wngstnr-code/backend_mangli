import { supabase } from '../../config/supabase';
import { CreateOrderDTO, Order, UpdateOrderStatusDTO } from '../../types/order.types';
import { AppError } from '../../middlewares/error-handler';
import { generateOrderNumber } from '../../utils/generate-order-number';
import { adminNotificationService } from '../admin-notification/admin-notification.service';
import { ticketService } from '../ticket/ticket.service';
import { invoiceService } from '../invoice/invoice.service';

const TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';

export class OrderService {
  async create(dto: CreateOrderDTO): Promise<Order & { items: unknown[] }> {
    const { items, ...orderData } = dto;

    if (!items || items.length === 0) {
      throw new AppError('Minimal satu item harus ditambahkan', 400);
    }

    // METODE CASH SEMENTARA DINONAKTIFKAN UNTUK PUBLIC (HANYA MIDTRANS):
    // Jika nanti Admin butuh, bisa dibuka kembali atau dibuatkan endpoint khusus
    // const allowedPaymentMethods = ['midtrans', 'cash'];
    const allowedPaymentMethods = ['midtrans'];

    const paymentMethod = orderData.payment_method === 'cash' ? 'midtrans' : (orderData.payment_method || 'midtrans');

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw new AppError('Metode pembayaran tidak valid. Saat ini hanya menerima "midtrans".', 400);
    }

    const { totalAmount, itemDetails } = await this._buildItemDetails(items, orderData.visit_date);

    const orderNumber = generateOrderNumber();

    let expiredAt: Date;
    // if (paymentMethod === 'cash') {
    //   expiredAt = new Date(`${orderData.visit_date}T23:59:59+07:00`);
    // } else {
    expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);
    // }

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

    // if (paymentMethod === 'cash') {
    //   ticketService.sendTicketEmail(order.id).catch((err) => console.error('Failed to send auto-ticket for cash order:', err));
    // }

    return { ...(order as Order), items: insertedItems || [] };
  }

  async createOffline(dto: CreateOrderDTO, adminId: string): Promise<Order & { items: unknown[] }> {
    const { items, ...orderData } = dto;

    if (!items || items.length === 0) {
      throw new AppError('Minimal satu item harus ditambahkan', 400);
    }

    const paymentMethod = 'cash';

    const { totalAmount, itemDetails } = await this._buildItemDetails(items, orderData.visit_date);

    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from(TABLE)
      .insert({
        ...orderData,
        order_number: orderNumber,
        payment_method: paymentMethod,
        visit_date: orderData.visit_date,
        status: 'paid', // LANGSUNG LUNAS
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) throw new AppError(orderError.message, 500);

    const orderItems = itemDetails.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) throw new AppError(itemsError.message, 500);

    await supabase.from('payments').insert({
      order_id: order.id,
      gateway_provider: 'cash',
      gateway_order_id: orderNumber,
      payment_type: 'cash',
      payment_channel: 'counter',
      status: 'settlement',
      amount: totalAmount,
      currency: 'IDR',
      received_by: adminId,
      paid_at: new Date().toISOString(),
    });

    const totalVisitors = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    const { error: checkinError } = await supabase.from('visitor_checkins').insert({
      order_id: order.id,
      checked_in_by: adminId,
      number_of_visitors: totalVisitors,
      notes: 'Auto check-in dari pembelian tiket offline (di tempat)',
    });

    if (checkinError) {
      console.error('Failed to auto check-in offline order:', checkinError.message);
    }

    await Promise.allSettled([
      invoiceService.sendInvoice(order.id),
      ticketService.sendTicketEmail(order.id),
    ]).then((results) => {
      results.forEach((res) => {
        if (res.status === 'rejected') console.error('Email failed:', res.reason);
      });
    });

    return { ...(order as Order), items: insertedItems || [] };
  }

  private async _buildItemDetails(
    items: CreateOrderDTO['items'],
    visitDate: string,
  ): Promise<{ totalAmount: number; itemDetails: object[] }> {
    const pkgIds = [...new Set(items.map((i) => i.tour_package_id))];

    const { data: packages, error: pkgError } = await supabase
      .from('tour_packages')
      .select('*, package_prices(*)')
      .in('id', pkgIds)
      .is('deleted_at', null);

    if (pkgError) throw new AppError(pkgError.message, 500);

    const packageMap = new Map(
      (packages || []).map((p: any) => [p.id as string, p]),
    );

    const { data: bookedData } = await supabase
      .from('order_items')
      .select('tour_package_id, quantity, orders!inner(visit_date, status)')
      .in('tour_package_id', pkgIds)
      .eq('orders.visit_date', visitDate)
      .in('orders.status', ['pending', 'paid']);

    const bookedMap = new Map<string, number>();
    for (const row of bookedData || []) {
      const prev = bookedMap.get(row.tour_package_id) || 0;
      bookedMap.set(row.tour_package_id, prev + row.quantity);
    }

    let totalAmount = 0;
    const itemDetails: object[] = [];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayOfWeek = new Date(visitDate).getDay();

    for (const item of items) {
      const tourPackage = packageMap.get(item.tour_package_id) as any;

      if (!tourPackage) {
        throw new AppError(`Paket wisata tidak ditemukan: ${item.tour_package_id}`, 404);
      }

      if (!tourPackage.is_active) {
        throw new AppError(`Paket "${tourPackage.name}" sedang tidak aktif`, 400);
      }

      if (tourPackage.available_days && !tourPackage.available_days.includes(dayOfWeek)) {
        throw new AppError(
          `Paket "${tourPackage.name}" tidak tersedia di hari ${dayNames[dayOfWeek]}`,
          400,
        );
      }

      if (tourPackage.blocked_dates && tourPackage.blocked_dates.includes(visitDate)) {
        throw new AppError(
          `Paket "${tourPackage.name}" tidak tersedia pada tanggal ${visitDate}`,
          400,
        );
      }

      const totalBooked = bookedMap.get(item.tour_package_id) || 0;
      if (totalBooked + item.quantity > tourPackage.max_participants) {
        const remaining = tourPackage.max_participants - totalBooked;
        throw new AppError(
          `Kuota paket "${tourPackage.name}" pada tanggal ${visitDate} tidak mencukupi. Sisa kuota: ${remaining} orang.`,
          400,
        );
      }

      if (!(item as any).package_price_id) {
        throw new AppError('Tipe tiket (package_price_id) wajib dipilih', 400);
      }

      const selectedPrice = tourPackage.package_prices?.find(
        (p: any) => p.id === (item as any).package_price_id,
      );
      if (!selectedPrice) {
        throw new AppError(`Tipe tiket tidak valid untuk paket "${tourPackage.name}"`, 400);
      }

      const unitPrice = selectedPrice.discount_price || selectedPrice.price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      itemDetails.push({
        tour_package_id: item.tour_package_id,
        package_price_id: (item as any).package_price_id,
        ticket_type_name: selectedPrice.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    return { totalAmount, itemDetails };
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
