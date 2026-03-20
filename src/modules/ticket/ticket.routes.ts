import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();


router.post('/:orderId/send', authMiddleware, ticketController.send);

export default router;
