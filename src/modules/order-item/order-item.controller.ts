import { Request, Response, NextFunction } from 'express';
import { orderItemService } from './order-item.service';

export class OrderItemController {
  async getByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const data = await orderItemService.getByOrderId(orderId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const data = await orderItemService.create(orderId, req.body);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await orderItemService.update(id, req.body);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await orderItemService.delete(id);

      res.json({ success: true, message: 'Order item berhasil dihapus' });
    } catch (error) {
      next(error);
    }
  }
}

export const orderItemController = new OrderItemController();
