import { supabase } from '../../config/supabase';
import { CreateOrderDTO, Order, UpdateOrderStatusDTO } from '../../types/order.types';
import { AppError } from '../../middlewares/error-handler';
import { generateOrderNumber } from '../../utils/generate-order-number';
import { tourPackageService } from '../tour-package/tour-package.service';
import { adminNotificationService } from '../admin-notification/admin-notification.service';

const TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';

export class OrderService {
  /**
   * Create a new order with order items
   */
  async create(dto: CreateOrderDTO): Promise<Order & { items: unknown[] }> {
    const { items, ...orderData } = dto;

    if (!items || items.length === 0) {
      throw new AppError('Minimal satu item harus ditambahkan', 400);
    }

    // Calculate total amount from items
    let totalAmount = 0;
    const itemDetails = [];

    for (const item of items) {
      const tourPackage = await tourPackageService.getById(item.tour_package_id);

      if (!tourPackage.is_active) {
        throw new AppError(`Paket "${tourPackage.name}" sedang tidak aktif`, 400);
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

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Set expiry 24 hours from now
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from(TABLE)
      .insert({
        ...orderData,
        order_number: orderNumber,
        source: orderData.source || 'web',
        status: 'pending',
        total_amount: totalAmount,
        expired_at: expiredAt.toISOString(),
      })
      .select()
      .single();

    if (orderError) throw new AppError(orderError.message, 500);

    // Insert order items
    const orderItems = itemDetails.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .insert(orderItems)
      .select();

    if (itemsError) throw new AppError(itemsError.message, 500);

    // Send admin notification (fire-and-forget)
    adminNotificationService
      .notifyNewOrder(orderNumber, orderData.full_name, totalAmount, order.id)
      .catch((err) => console.error('Failed to send admin notification:', err));

    return { ...(order as Order), items: insertedItems || [] };
  }

  /**
   * Get all orders with pagination
   */
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

  /**
   * Get order by ID with items
   */
  async getById(id: string): Promise<Order & { items: unknown[] }> {
    const { data: order, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) throw new AppError('Order tidak ditemukan', 404);

    // Get order items with tour package info
    const { data: items } = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('*, tour_packages(*)')
      .eq('order_id', id);

    return { ...(order as Order), items: items || [] };
  }

  /**
   * Get order by order number
   */
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

  /**
   * Update order status
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDTO): Promise<Order> {
    // Check exists
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
}

export const orderService = new OrderService();
