import { Router } from 'express';
import { visitorCheckinController } from './visitor-checkin.controller';
import { validateRequiredFields } from '../../middlewares/validate';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// All routes require admin auth
// Record check-in
router.post(
  '/',
  authMiddleware,
  validateRequiredFields(['order_id', 'number_of_visitors']),
  visitorCheckinController.checkin
);

// Get summary statistics
router.get('/summary', authMiddleware, visitorCheckinController.getSummary);

// Get all check-ins (with optional date filter)
router.get('/', authMiddleware, visitorCheckinController.getAll);

// Get check-in by order ID
router.get('/order/:orderId', authMiddleware, visitorCheckinController.getByOrderId);

export default router;
