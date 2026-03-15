export interface Payment {
  id: string;
  order_id: string;
  gateway_provider: string;
  gateway_transaction_id: string | null;
  gateway_order_id: string | null;
  payment_type: string | null;
  payment_channel: string | null;
  status: string;
  amount: number;
  currency: string;
  redirect_url: string | null;
  snap_token: string | null;
  va_number: string | null;
  payment_code: string | null;
  received_by: string | null;
  receipt_number: string | null;
  gateway_response: Record<string, unknown> | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCashPaymentDTO {
  amount: number;
  received_by?: string;
  receipt_number?: string;
  payment_channel?: string;
}

export interface MidtransNotificationPayload {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status: string;
  currency: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  payment_code?: string;
  [key: string]: unknown;
}
