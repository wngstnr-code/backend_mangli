import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// Public: View HTML ticket (for browser printing)
router.get('/:orderId/print', ticketController.print);

// Admin: Resend ticket email
router.post('/:orderId/send', authMiddleware, ticketController.send);

export default router;
