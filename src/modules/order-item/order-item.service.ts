import { supabase } from '../../config/supabase';
import { OrderItem, CreateOrderItemDTO, UpdateOrderItemDTO } from '../../types/order-item.types';
import { AppError } from '../../middlewares/error-handler';
import { tourPackageService } from '../tour-package/tour-package.service';

const TABLE = 'order_items';

export class OrderItemService {
  async getByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, tour_packages(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new AppError(error.message, 500);

    return data as OrderItem[];
  }

  async create(orderId: string, dto: CreateOrderItemDTO): Promise<OrderItem> {
    const tourPackage = await tourPackageService.getById(dto.tour_package_id);

    if (!tourPackage.is_active) {
      throw new AppError(`Paket "${tourPackage.name}" sedang tidak aktif`, 400);
    }

    if (!dto.package_price_id) {
      throw new AppError('Tipe tiket (package_price_id) wajib dipilih', 400);
    }

    const selectedPrice = tourPackage.package_prices?.find(p => p.id === dto.package_price_id);
    if (!selectedPrice) {
      throw new AppError(`Tipe tiket tidak valid untuk paket "${tourPackage.name}"`, 400);
    }

    const unitPrice = selectedPrice.discount_price || selectedPrice.price;
    const subtotal = unitPrice * dto.quantity;

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        order_id: orderId,
        tour_package_id: dto.tour_package_id,
        package_price_id: dto.package_price_id,
        ticket_type_name: selectedPrice.name,
        quantity: dto.quantity,
        unit_price: unitPrice,
        subtotal,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    await this.recalculateOrderTotal(orderId);

    return data as OrderItem;
  }

  async update(id: string, dto: UpdateOrderItemDTO): Promise<OrderItem> {
    const { data: existing, error: findError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) throw new AppError('Order item tidak ditemukan', 404);

    const quantity = dto.quantity ?? existing.quantity;
    const subtotal = existing.unit_price * quantity;

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        quantity,
        subtotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    await this.recalculateOrderTotal(existing.order_id);

    return data as OrderItem;
  }

  async delete(id: string): Promise<void> {
    const { data: existing, error: findError } = await supabase
      .from(TABLE)
      .select('order_id')
      .eq('id', id)
      .single();

    if (findError || !existing) throw new AppError('Order item tidak ditemukan', 404);

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 500);

    await this.recalculateOrderTotal(existing.order_id);
  }

  private async recalculateOrderTotal(orderId: string): Promise<void> {
    const { data: items, error } = await supabase
      .from(TABLE)
      .select('subtotal')
      .eq('order_id', orderId);

    if (error) throw new AppError(error.message, 500);

    const total = (items || []).reduce((sum, item) => sum + Number(item.subtotal), 0);

    await supabase
      .from('orders')
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }
}

export const orderItemService = new OrderItemService();
