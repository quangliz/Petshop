export interface Variant {
  id: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  stock_qty: number;
  attributes: Record<string, string>;
  is_active: boolean;
  images?: ProductImage[];
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
  review_count?: number;
  avg_rating?: number;
  sold_count?: number;
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
  has_variants?: boolean;
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
  is_expert_verified?: boolean;
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

export interface Banner {
  id: number;
  image_url: string;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  title?: string | null;
  subtitle?: string | null;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ForumAuthor {
  id: string | null;
  full_name: string;
  role: string;
  is_expert: boolean;
  is_expert_verified: boolean;
}

export interface ForumThread {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_label: string;
  body?: string;
  body_preview?: string;
  tags: string[];
  status: string;
  is_locked: boolean;
  is_ai_blocked: boolean;
  knowledge_status: string;
  knowledge_score: number;
  upvote_count: number;
  downvote_count: number;
  reply_count: number;
  accepted_reply_id: string | null;
  author: ForumAuthor;
  last_activity_at: string | null;
  created_at: string | null;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  body: string;
  status: string;
  is_ai_blocked: boolean;
  is_expert_answer: boolean;
  is_accepted: boolean;
  upvote_count: number;
  downvote_count: number;
  expert_upvote_count: number;
  knowledge_status: string;
  knowledge_score: number;
  author: ForumAuthor;
  created_at: string | null;
  updated_at: string | null;
}
