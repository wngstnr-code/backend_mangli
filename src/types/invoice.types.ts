export interface SendInvoiceDTO {
  order_id: string;
  to_email?: string; // Override email from order
}
