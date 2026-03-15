export interface TourPackage {
  id: string;
  name: string;
  slug: string;
  travel_date: string;
  description: string;
  price: number;
  discount_price: number;
  duration_days: number;
  max_participants: number;
  location: string;
  image_url: string;
  gallery_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTourPackageDTO {
  name: string;
  slug: string;
  travel_date: string;
  description: string;
  price: number;
  discount_price?: number;
  duration_days: number;
  max_participants: number;
  location: string;
  image_url?: string;
  gallery_urls?: string[];
  is_active?: boolean;
}

export interface UpdateTourPackageDTO {
  name?: string;
  slug?: string;
  travel_date?: string;
  description?: string;
  price?: number;
  discount_price?: number;
  duration_days?: number;
  max_participants?: number;
  location?: string;
  image_url?: string;
  gallery_urls?: string[];
  is_active?: boolean;
}
