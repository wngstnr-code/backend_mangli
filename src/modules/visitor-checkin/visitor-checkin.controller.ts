import { Request, Response, NextFunction } from 'express';
import { visitorCheckinService } from './visitor-checkin.service';

export class VisitorCheckinController {
  async checkin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await visitorCheckinService.checkin(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const data = await visitorCheckinService.getByOrderId(orderId);

      if (!data) {
        res.json({ success: true, data: null, message: 'Belum check-in' });
        return;
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, date } = req.query;

      const result = await visitorCheckinService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        date: date as string,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.count,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 10,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.query.date as string | undefined;
      const data = await visitorCheckinService.getSummary(date);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const visitorCheckinController = new VisitorCheckinController();
