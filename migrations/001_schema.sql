-- ============================================================
-- DJ SHAGGY — Migration 001: full schema (idempotent, non-destructive)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
-- Apply in Supabase → SQL Editor. Existing data is never dropped.
-- ============================================================

create table if not exists genres (
  id serial primary key,
  name varchar(120) not null,
  slug varchar(140) not null,
  description text default '',
  accent varchar(9) default '#d8b45a',
  image_url text default '',
  sort_order integer default 0,
  published boolean default true
);

create table if not exists collections (
  id serial primary key,
  name varchar(120) not null,
  slug varchar(140) not null,
  description text default '',
  image_url text default '',
  sort_order integer default 0,
  published boolean default true
);

create table if not exists products (
  id serial primary key,
  name varchar(160) not null,
  slug varchar(180) not null,
  description text default '',
  price numeric default 0,
  original_price numeric,
  track_count integer default 0,
  tags jsonb default '[]',
  is_bestseller boolean default false,
  is_featured boolean default false,
  status varchar(20) default 'draft',
  artwork_url text default '',
  preview_note text default '',
  genre_id integer references genres(id) on delete set null,
  collection_id integer references collections(id) on delete set null,
  delivery_link text default '',
  drive_folder_id varchar(120) default '',
  drive_folder_url text default '',
  created_at timestamptz default now()
);

create table if not exists product_meta (
  product_id integer primary key references products(id) on delete cascade,
  preview_audio_url text default '',
  sort_order integer default 0,
  is_available boolean default true
);

create table if not exists collection_products (
  id serial primary key,
  product_id integer not null references products(id) on delete cascade,
  collection_id integer not null references collections(id) on delete cascade
);

create table if not exists bundles (
  id serial primary key,
  name varchar(160) not null,
  slug varchar(180) not null,
  description text default '',
  price numeric default 0,
  original_price numeric,
  artwork_url text default '',
  product_ids jsonb default '[]',
  status varchar(20) default 'draft',
  created_at timestamptz default now()
);

create table if not exists orders (
  id varchar(24) primary key,
  customer_name varchar(120) not null,
  email varchar(160) not null,
  phone varchar(20) not null,
  items jsonb not null,
  subtotal numeric default 0,
  discount_code varchar(40),
  discount_amount numeric default 0,
  amount numeric not null,
  utr varchar(60),
  payment_screenshot_path text,
  payment_status varchar(24) default 'pending_verification',
  delivery_status varchar(20) default 'pending',
  admin_note text,
  confirmation_email_sent boolean default false,
  delivery_email_sent boolean default false,
  delivery_email_note text,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists order_events (
  id serial primary key,
  order_id varchar(24) not null references orders(id) on delete cascade,
  event varchar(40) not null,
  note text default '',
  actor varchar(30) default 'system',
  created_at timestamptz default now()
);

create table if not exists faqs (
  id serial primary key,
  question varchar(300) not null,
  answer text not null,
  category varchar(60) default 'General',
  sort_order integer default 0,
  published boolean default true
);

create table if not exists coupons (
  id serial primary key,
  code varchar(40) not null,
  kind varchar(10) default 'percent',
  value numeric default 0,
  min_amount numeric default 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer default 0,
  expires_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists messages (
  id serial primary key,
  name varchar(120) not null,
  email varchar(160) not null,
  subject varchar(160) default 'General enquiry',
  message text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists settings (
  key varchar(60) primary key,
  value jsonb not null
);

create table if not exists drive_import_log (
  id serial primary key,
  folder_id varchar(120) not null,
  folder_name varchar(200),
  product_id integer references products(id) on delete cascade,
  imported_at timestamptz default now()
);

create table if not exists drive_mappings (
  id serial primary key,
  folder_id varchar(120) not null,
  name varchar(160) not null,
  note text default '',
  enabled boolean default true,
  last_synced_at timestamptz,
  last_status varchar(30) default 'never',
  last_error text,
  file_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists drive_files (
  id serial primary key,
  mapping_id integer not null references drive_mappings(id) on delete cascade,
  file_id varchar(120) not null,
  name varchar(300) not null,
  mime varchar(120) default '',
  size_bytes bigint default 0,
  modified_at timestamptz,
  parent_id varchar(120) default '',
  parent_path varchar(500) default '/',
  status varchar(20) default 'staged',
  product_id integer references products(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists drive_sync_log (
  id serial primary key,
  mapping_id integer references drive_mappings(id) on delete set null,
  mapping_name varchar(160) default '',
  status varchar(20) default 'ok',
  files_found integer default 0,
  files_new integer default 0,
  files_imported integer default 0,
  files_missing integer default 0,
  error text,
  created_at timestamptz default now()
);

create table if not exists home_sections (
  id serial primary key,
  key varchar(40) not null,
  title varchar(160) default '',
  subtitle text default '',
  visible boolean default true,
  sort_order integer default 0,
  config jsonb default '{}'
);

create table if not exists banners (
  id serial primary key,
  title varchar(160) default '',
  subtitle varchar(200) default '',
  image_url text default '',
  cta_label varchar(60) default '',
  cta_link varchar(200) default '',
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists gallery (
  id serial primary key,
  title varchar(160) default '',
  alt varchar(200) default '',
  image_url text not null,
  sort_order integer default 0,
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists admin_audit_log (
  id serial primary key,
  actor varchar(160) default '',
  action varchar(60) not null,
  detail varchar(300) default '',
  created_at timestamptz default now()
);

-- Useful indexes (idempotent)
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_genre on products(genre_id);
create index if not exists idx_collection_products_coll on collection_products(collection_id);
create index if not exists idx_orders_email on orders(email);
create index if not exists idx_orders_created on orders(created_at desc);
create index if not exists idx_order_events_order on order_events(order_id);
create index if not exists idx_drive_files_mapping on drive_files(mapping_id);
create index if not exists idx_drive_files_product on drive_files(product_id);
create index if not exists idx_audit_created on admin_audit_log(created_at desc);

-- Hardening (repeatable): enable RLS so the deny-all policies apply.
alter table products enable row level security;
alter table product_meta enable row level security;
alter table genres enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;
alter table bundles enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table faqs enable row level security;
alter table coupons enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;
alter table drive_import_log enable row level security;
alter table drive_mappings enable row level security;
alter table drive_files enable row level security;
alter table drive_sync_log enable row level security;
alter table home_sections enable row level security;
alter table banners enable row level security;
alter table gallery enable row level security;
alter table admin_audit_log enable row level security;
