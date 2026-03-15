import { Router } from 'express';
import { orderItemController } from './order-item.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Get items by order
router.get('/orders/:orderId/items', orderItemController.getByOrderId);

// Add item to order
router.post(
  '/orders/:orderId/items',
  validateRequiredFields(['tour_package_id', 'quantity']),
  orderItemController.create
);

// Update item
router.put('/order-items/:id', orderItemController.update);

// Delete item
router.delete('/order-items/:id', orderItemController.delete);

export default router;
