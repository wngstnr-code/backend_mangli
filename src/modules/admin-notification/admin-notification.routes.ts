import { Router } from 'express';
import { adminNotificationController } from './admin-notification.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/unread-count', authMiddleware, adminNotificationController.getUnreadCount);

router.patch('/read-all', authMiddleware, adminNotificationController.markAllAsRead);

router.get('/', authMiddleware, adminNotificationController.getAll);

router.patch('/:id/read', authMiddleware, adminNotificationController.markAsRead);

export default router;
