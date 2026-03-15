import { Request, Response, NextFunction } from 'express';
import { adminNotificationService } from './admin-notification.service';

export class AdminNotificationController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, is_read } = req.query;

      const result = await adminNotificationService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.count,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await adminNotificationService.getUnreadCount();
      res.json({ success: true, data: { unread_count: count } });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await adminNotificationService.markAsRead(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminNotificationService.markAllAsRead();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const adminNotificationController = new AdminNotificationController();
