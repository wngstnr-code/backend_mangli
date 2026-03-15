export interface OrderItem {
  id: string;
  order_id: string;
  tour_package_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderItemDTO {
  tour_package_id: string;
  quantity: number;
}

export interface UpdateOrderItemDTO {
  quantity?: number;
}
