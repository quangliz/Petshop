export interface Variant {
  id: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  stock_qty: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

export interface AttrImage {
  attr_key: string;
  attr_value: string;
  url: string;
}

export interface ProductImage {
  id: string;
  url: string;
  is_main: boolean;
  sort_order: number;
  variant_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  thumbnail_url?: string | null;
  images?: {
    main?: string;
  };
  brand?: string | null;
  is_new?: boolean;
  reviews_count?: number;
  review_count?: number; // Some parts of the API use review_count
  avg_rating?: number;
  description?: string;
  sku?: string;
  stock_qty?: number;
  category_name?: string;
  target_species?: {
    label?: string;
    species?: string[];
  };
  variants?: Variant[];
  attr_images?: AttrImage[];
  attributes?: Record<string, string>;
  category_id?: number;
  is_active?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  role: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age_months?: number;
  weight_kg?: number;
  gender?: string;
  health_notes?: string;
  allergies?: string;
  avatar_url?: string;
}

export interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  customer_email: string;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}
