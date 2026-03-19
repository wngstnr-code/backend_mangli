interface TicketItem {
  tour_packages?: {
    name: string;
  };
  quantity: number;
}

interface TicketOrder {
  order_number: string;
  full_name: string;
  visit_date: string;
  status: string;
  total_amount: number;
}

export function generateTicketHTML(
  order: TicketOrder,
  items: TicketItem[],
  qrCodeDataURL: string,
  isEmail: boolean = false,
  qrCid: string = 'qrcode'
): string {
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; color: #374151;">
          ${item.tour_packages?.name || '-'}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; color: #111827; font-weight: bold; text-align: right; width: 60px;">
          x${item.quantity}
        </td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media print {
      body { background-color: white !important; }
      .ticket-container { box-shadow: none !important; border: 1px solid #e5e7eb; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  
  <div style="width: 100%; max-width: 400px; margin: 0 auto;">
    
    <!-- The Ticket -->
    <div class="ticket-container" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 20px;">
      
      <!-- Ticket Header -->
      <div style="background: linear-gradient(135deg, #16e08c, #059669); color: #ffffff; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; color: #ffffff !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">E-TICKET</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: bold; opacity: 0.9; color: #ffffff !important;">Kawasan Agroeduwisata Mangli</p>
      </div>

      <!-- Ticket Body -->
      <div style="padding: 24px;">
        
        <!-- QR Code Section -->
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${isEmail ? 'cid:' + qrCid : qrCodeDataURL}" alt="QR Code" width="200" height="200" style="display: block; margin: 0 auto; border: none;">
          <p style="margin: 12px 0 0 0; font-family: monospace; font-size: 16px; letter-spacing: 2px; color: #374151;">${order.order_number}</p>
        </div>

        <hr style="border: none; border-top: 2px dashed #e5e7eb; margin: 20px 0;">

        <!-- Visitor Info -->
        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Nama Pengunjung</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #111827;">${order.full_name}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Tanggal Kunjungan</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #059669;">${formatDate(order.visit_date)}</p>
        </div>

        <!-- Package Details -->
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 10px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: bold; color: #374151; text-transform: uppercase;">Akses Paket</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemRows}
          </table>
        </div>
      </div>


      <!-- Ticket Footer (Tear-off line effect) -->
      <div style="background: linear-gradient(135deg, #16e08c, #059669); padding: 12px; position: relative; text-align: center;">
        <p style="margin: 0; font-size: 11px; font-weight: 500; color: #ffffff !important; opacity: 0.9;">Tunjukkan tiket ini kepada petugas di pintu masuk.</p>
      </div>
    </div>

  </div>
</body>
</html>`;
}
