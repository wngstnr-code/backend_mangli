import { Router } from 'express';
import { adminNotificationController } from './admin-notification.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// All routes require admin auth
// Get unread count
router.get('/unread-count', authMiddleware, adminNotificationController.getUnreadCount);

// Mark all as read
router.patch('/read-all', authMiddleware, adminNotificationController.markAllAsRead);

// Get all notifications (query: ?is_read=true/false&page=&limit=)
router.get('/', authMiddleware, adminNotificationController.getAll);

// Mark single notification as read
router.patch('/:id/read', authMiddleware, adminNotificationController.markAsRead);

export default router;
