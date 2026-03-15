import { CreateOrderItemDTO } from './order-item.types';

export interface Order {
  id: string;
  user_id: string | null;
  created_by: string | null;
  full_name: string;
  phone_number: string;
  email: string;
  order_number: string;
  source: string;
  status: string;
  total_amount: number;
  admin_notes: string | null;
  expired_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderDTO {
  full_name: string;
  phone_number: string;
  email: string;
  source?: string;
  user_id?: string;
  created_by?: string;
  admin_notes?: string;
  items: CreateOrderItemDTO[];
}

export interface UpdateOrderStatusDTO {
  status: string;
  admin_notes?: string;
}
