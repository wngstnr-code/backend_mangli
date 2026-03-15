import { Request, Response, NextFunction } from 'express';
import { invoiceService } from './invoice.service';

export class InvoiceController {
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { order_id, to_email } = req.body;
      const data = await invoiceService.sendInvoice(order_id, to_email);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
