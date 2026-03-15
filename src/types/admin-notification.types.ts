export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  order_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CreateAdminNotificationDTO {
  type?: string;
  title: string;
  message: string;
  order_id?: string;
}
