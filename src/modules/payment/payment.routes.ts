import { Router } from 'express';
import { paymentController } from './payment.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Create Midtrans payment
router.post('/midtrans/:orderId', paymentController.createMidtransPayment);

// Create cash payment
router.post(
  '/cash/:orderId',
  validateRequiredFields(['amount']),
  paymentController.createCashPayment
);

// Midtrans webhook notification
router.post('/midtrans/notification', paymentController.handleNotification);

// Get payment by order
router.get('/order/:orderId', paymentController.getByOrderId);

// Get all payments (admin)
router.get('/', paymentController.getAll);

// Get payment by ID
router.get('/:id', paymentController.getById);

export default router;
