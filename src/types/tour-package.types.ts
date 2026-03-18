export interface TourPackage {
  id: string;
  name: string;
  slug: string;
  available_days: number[];
  description: string;
  price: number;
  discount_price: number;
  duration_days: number;
  max_participants: number;
  location: string;
  image_url: string;
  gallery_urls: string[];
  is_active: boolean;
  blocked_dates: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTourPackageDTO {
  name: string;
  slug: string;
  available_days: number[];
  description: string;
  price: number;
  discount_price?: number;
  duration_days: number;
  max_participants: number;
  location: string;
  image_url?: string;
  gallery_urls?: string[];
  is_active?: boolean;
  blocked_dates?: string[];
}

export interface UpdateTourPackageDTO {
  name?: string;
  slug?: string;
  available_days?: number[];
  description?: string;
  price?: number;
  discount_price?: number;
  duration_days?: number;
  max_participants?: number;
  location?: string;
  image_url?: string;
  gallery_urls?: string[];
  is_active?: boolean;
  blocked_dates?: string[];
}
