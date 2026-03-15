interface InvoiceItem {
  tour_packages?: {
    name: string;
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoiceOrder {
  order_number: string;
  full_name: string;
  email: string;
  phone_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  expired_at: string;
}

interface InvoicePayment {
  payment_type?: string;
  status?: string;
  paid_at?: string;
}

export function generateInvoiceHTML(
  order: InvoiceOrder,
  items: InvoiceItem[],
  payment?: InvoicePayment | null
): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: '⏳ Menunggu Pembayaran',
      paid: '✅ Sudah Dibayar',
      confirmed: '✅ Dikonfirmasi',
      cancelled: '❌ Dibatalkan',
      expired: '⏰ Kedaluwarsa',
    };
    return map[status] || status;
  };

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.tour_packages?.name || '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🏔️ Mangli Travel</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Invoice Pemesanan</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <!-- Order Info -->
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">No. Order</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">${order.order_number}</p>
      </div>

      <table style="width: 100%; margin-bottom: 24px; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Nama</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 500;">${order.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Email</td>
          <td style="padding: 4px 0; text-align: right;">${order.email}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Telepon</td>
          <td style="padding: 4px 0; text-align: right;">${order.phone_number}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Tanggal Order</td>
          <td style="padding: 4px 0; text-align: right;">${formatDate(order.created_at)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Status</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 500;">${statusLabel(order.status)}</td>
        </tr>
        ${payment?.paid_at ? `
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Dibayar pada</td>
          <td style="padding: 4px 0; text-align: right;">${formatDate(payment.paid_at)}</td>
        </tr>` : ''}
      </table>

      <!-- Items Table -->
      <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #374151;">Detail Pesanan</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Paket</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Harga</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Total -->
      <div style="background: #059669; color: white; padding: 16px; border-radius: 8px; text-align: right;">
        <span style="font-size: 14px;">Total Pembayaran</span>
        <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold;">${formatCurrency(order.total_amount)}</p>
      </div>

      ${order.status === 'pending' ? `
      <!-- Payment Reminder -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin-top: 16px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⚠️ Harap selesaikan pembayaran sebelum <strong>${formatDate(order.expired_at)}</strong>
        </p>
      </div>` : ''}

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #9ca3af;">Terima kasih telah memesan di Mangli Travel!</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #d1d5db;">Email ini dikirim otomatis, mohon tidak membalas email ini.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
