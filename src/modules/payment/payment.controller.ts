import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';

export class PaymentController {
  async createMidtransPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const data = await paymentService.createMidtransPayment(orderId);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createCashPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const adminId = (req as any).admin.id;
      const data = await paymentService.createCashPayment(orderId, req.body, adminId);

      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async handleNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paymentService.handleNotification(req.body);

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const data = await paymentService.getByOrderId(orderId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await paymentService.getById(id);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status, gateway_provider } = req.query;

      const result = await paymentService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string,
        gateway_provider: gateway_provider as string,
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
}

export const paymentController = new PaymentController();
