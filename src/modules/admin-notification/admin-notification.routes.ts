import { Router } from 'express';
import { adminNotificationController } from './admin-notification.controller';

const router = Router();

// Get unread count
router.get('/unread-count', adminNotificationController.getUnreadCount);

// Mark all as read
router.patch('/read-all', adminNotificationController.markAllAsRead);

// Get all notifications (query: ?is_read=true/false&page=&limit=)
router.get('/', adminNotificationController.getAll);

// Mark single notification as read
router.patch('/:id/read', adminNotificationController.markAsRead);

export default router;
