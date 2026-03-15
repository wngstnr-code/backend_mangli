import { supabase } from '../../config/supabase';
import { CreateTourPackageDTO, TourPackage, UpdateTourPackageDTO } from '../../types/tour-package.types';
import { AppError } from '../../middlewares/error-handler';

const TABLE = 'tour_packages';

export class TourPackageService {
  /**
   * Get all active tour packages with optional pagination & search
   */
  async getAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    is_active?: boolean;
  }): Promise<{ data: TourPackage[]; count: number }> {
    const { page = 1, limit = 10, search, location, is_active } = params;
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 500);

    return { data: data as TourPackage[], count: count || 0 };
  }

  /**
   * Get a single tour package by slug (for public detail page)
   */
  async getBySlug(slug: string): Promise<TourPackage> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new AppError('Paket wisata tidak ditemukan', 404);

    return data as TourPackage;
  }

  /**
   * Get a single tour package by ID
   */
  async getById(id: string): Promise<TourPackage> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) throw new AppError('Paket wisata tidak ditemukan', 404);

    return data as TourPackage;
  }

  /**
   * Create a new tour package
   */
  async create(dto: CreateTourPackageDTO): Promise<TourPackage> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        ...dto,
        is_active: dto.is_active ?? true,
        gallery_urls: dto.gallery_urls ?? [],
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as TourPackage;
  }

  /**
   * Update an existing tour package
   */
  async update(id: string, dto: UpdateTourPackageDTO): Promise<TourPackage> {
    // Check exists
    await this.getById(id);

    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    return data as TourPackage;
  }

  /**
   * Soft delete a tour package
   */
  async softDelete(id: string): Promise<void> {
    // Check exists
    await this.getById(id);

    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }
}

export const tourPackageService = new TourPackageService();
