import { Request, Response, NextFunction } from 'express';
import { ticketService } from './ticket.service';

export class TicketController {
  async print(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { html } = await ticketService.getTicketHTML(orderId);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { to_email } = req.body;
      const data = await ticketService.sendTicketEmail(orderId, to_email);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
