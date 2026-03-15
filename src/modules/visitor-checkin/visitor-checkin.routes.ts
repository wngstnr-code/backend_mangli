import { Router } from 'express';
import { visitorCheckinController } from './visitor-checkin.controller';
import { validateRequiredFields } from '../../middlewares/validate';

const router = Router();

// Record check-in
router.post(
  '/',
  validateRequiredFields(['order_id', 'number_of_visitors']),
  visitorCheckinController.checkin
);

// Get summary statistics
router.get('/summary', visitorCheckinController.getSummary);

// Get all check-ins (with optional date filter)
router.get('/', visitorCheckinController.getAll);

// Get check-in by order ID
router.get('/order/:orderId', visitorCheckinController.getByOrderId);

export default router;
