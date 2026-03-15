import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';

export class OrderController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await orderService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status } = req.query;

      const result = await orderService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string,
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

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await orderService.getById(id);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getByOrderNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderNumber = req.params.orderNumber as string;
      const data = await orderService.getByOrderNumber(orderNumber);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await orderService.updateStatus(id, req.body);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
