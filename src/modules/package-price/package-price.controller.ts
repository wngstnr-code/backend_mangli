import { Request, Response, NextFunction } from 'express';
import { packagePriceService } from './package-price.service';

export class PackagePriceController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tourPackageId = req.query.tour_package_id as string;
      const data = await packagePriceService.getAll(tourPackageId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await packagePriceService.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await packagePriceService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await packagePriceService.update(id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await packagePriceService.delete(id);
      res.json({ success: true, message: 'Harga tiket berhasil dihapus' });
    } catch (error) {
      next(error);
    }
  }
}

export const packagePriceController = new PackagePriceController();
