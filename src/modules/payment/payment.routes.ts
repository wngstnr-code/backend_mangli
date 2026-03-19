import { Router } from 'express';
import { paymentController } from './payment.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Public: Create Midtrans payment (customer-initiated)
router.post('/midtrans/:orderId', paymentController.createMidtransPayment);

// Public: Midtrans webhook notification (called by Midtrans servers)
router.post('/midtrans/notification', paymentController.handleNotification);

// Admin: Create cash payment
router.post(
  '/cash/:orderId',
  authMiddleware,
  validateRequiredFields(['amount', 'received_by']),
  paymentController.createCashPayment
);

// Admin: Get payment by order
router.get('/order/:orderId', authMiddleware, paymentController.getByOrderId);

// Admin: Get all payments
router.get('/', authMiddleware, paymentController.getAll);

// Admin: Get payment by ID
router.get('/:id', authMiddleware, paymentController.getById);

export default router;
