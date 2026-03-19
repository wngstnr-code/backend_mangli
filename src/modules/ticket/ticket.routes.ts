import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/:orderId/print', ticketController.print);

router.post('/:orderId/send', authMiddleware, ticketController.send);

export default router;
