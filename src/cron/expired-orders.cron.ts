import cron from 'node-cron';
import { orderService } from '../modules/order/order.service';

/**
 * Schedule job to check and expire overdue orders
 * Runs every 5 minutes
 */
export const startExpiredOrdersCron = (): void => {
  // '*/5 * * * *' = Every 5 minutes
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
