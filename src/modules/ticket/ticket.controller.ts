import { Request, Response, NextFunction } from 'express';
import { ticketService } from './ticket.service';

export class TicketController {
  /**
   * Return HTML page representing the ticket
   * User can print from browser (Ctrl+P)
   */
  async print(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const { html } = await ticketService.getTicketHTML(orderId);

      // Send raw HTML to browser
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Resend ticket email
   */
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
