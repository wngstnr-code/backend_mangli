import cron from 'node-cron';
import { orderService } from '../modules/order/order.service';

export const startExpiredOrdersCron = (): void => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log(`[Cron] Executing expireOverdueOrders at ${new Date().toISOString()}`);
      const result = await orderService.expireOverdueOrders();
      
      if (result.expired_count > 0) {
        console.log(`[Cron] Successfully expired ${result.expired_count} overdue orders.`);
      }
    } catch (error) {
      console.error('[Cron] Error executing expireOverdueOrders:', error);
    }
  });

  console.log('[Cron] Expired orders job scheduled (runs every 5 minutes)');
};
