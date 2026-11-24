export interface Genre {
  id: number; name: string; slug: string; description: string; accent: string;
  image_url?: string; sort_order: number; published: boolean;
}

export interface Collection {
  id: number; name: string; slug: string; description: string; image_url: string;
  sort_order: number; published: boolean;
}

export interface Product {
  id: number; name: string; slug: string; description: string;
  price: number; original_price: number | null; track_count: number;
  tags: string[]; is_bestseller: boolean; is_featured: boolean; status: string;
  artwork_url: string; preview_note: string; genre_id: number | null; collection_id: number | null;
  created_at: string; genres?: Genre | null;
  delivery_link?: string; drive_folder_url?: string; drive_folder_id?: string;
  preview_audio_url?: string; sort_order?: number; is_available?: boolean;
  collection_ids?: number[];
}

export interface Bundle {
  id: number; name: string; slug: string; description: string;
  price: number; original_price: number | null; artwork_url: string;
  product_ids: number[]; status: string; created_at?: string;
  products?: Product[];
}

export interface Faq {
  id: number; question: string; answer: string; category: string;
  sort_order: number; published: boolean;
}

export interface Discount {
  id: number; code: string; kind: 'percent' | 'flat'; value: number;
  min_amount: number; active: boolean; created_at?: string;
  max_discount: number | null; usage_limit: number | null;
  used_count: number; expires_at: string | null;
}

export interface HomeSection {
  id: number; key: string; title: string; subtitle: string;
  visible: boolean; sort_order: number; config: Record<string, any>;
}

export interface Banner {
  id: number; title: string; subtitle: string; image_url: string;
  cta_label: string; cta_link: string; active: boolean; sort_order: number;
}

export interface GalleryImage {
  id: number; title: string; alt: string; image_url: string;
  sort_order: number; published: boolean; created_at?: string;
}

export interface CustomerSummary {
  email: string; name: string; phone: string;
  order_count: number; total_spent: number; last_order_at: string;
  orders: { id: string; amount: number; payment_status: string; delivery_status: string; created_at: string; items: { name: string; price: number; type: string }[] }[];
}

export interface AdminStats {
  products_total: number; products_published: number;
  orders_total: number; orders_pending: number; orders_delivered: number;
  revenue_verified: number; customers_total: number; messages_open: number;
  storage_bytes: number; storage_by_bucket: { artwork: number; media: number; payments: number };
}

export interface CartItem {
  key: string; type: 'product' | 'bundle'; id: number; name: string;
  slug: string; price: number; artwork_url: string;
}

export interface OrderItem {
  type: 'product' | 'bundle'; id: number; name: string; price: number;
  artwork_url?: string; link?: string;
}

export interface Order {
  id: string; customer_name: string; email: string; phone: string;
  items: OrderItem[]; subtotal: number; discount_code: string | null;
  discount_amount: number; amount: number; utr: string | null;
  payment_screenshot_path?: string | null; screenshot_url?: string | null;
  payment_status: string; delivery_status: string; status_label?: string;
  admin_note?: string | null; created_at: string; delivered_at: string | null;
  delivery_email_sent?: boolean; delivery_email_note?: string | null;
  order_events?: { id: number; event: string; note: string; actor: string; created_at: string }[];
}

export interface SiteSettings {
  payment: { upi_id: string; payee_name: string; qr_url: string; instructions: string };
  whatsapp: { number: string; display: string; message: string };
  site: {
    announcement: string; hero_title: string; hero_subtitle: string;
    about_short: string; about_long: string; support_email: string;
    phone_display: string; phone_tel: string; instagram: string; instagram_handle: string;
    facebook?: string; youtube?: string; contact_intro?: string; chat_avatar_url?: string;
  };
  seo: { title: string; description: string; keywords: string; og_image: string; favicon_url?: string };
  delivery: { note: string };
  admin?: { emails: string[] };
}

export interface SupportMessage {
  id: number; name: string; email: string; subject: string;
  message: string; resolved: boolean; created_at: string;
}
