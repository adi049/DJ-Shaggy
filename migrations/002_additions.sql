-- ============================================================
-- DJ SHAGGY — Migration 002: later additions (idempotent, additive)
-- Safe to re-run. No drops, no data changes beyond missing seed rows.
-- ============================================================

-- Rate limiting (persistent, cross-instance)
create table if not exists rate_limits (
  key varchar(120) not null,
  window_start timestamptz not null,
  count integer default 0
);
create index if not exists idx_rate_limits_key on rate_limits(key, window_start);

-- Blog
create table if not exists posts (
  id serial primary key,
  title varchar(200) not null,
  slug varchar(220) not null,
  excerpt varchar(300) default '',
  content text default '',
  image_url text default '',
  seo_title varchar(200) default '',
  seo_desc varchar(300) default '',
  status varchar(20) default 'draft',
  author varchar(80) default 'DJ SHAGGY',
  created_at timestamptz default now()
);
create index if not exists idx_posts_slug on posts(slug);
create index if not exists idx_posts_status on posts(status);

alter table rate_limits enable row level security;
alter table posts enable row level security;

-- ============================================================
-- The 17 official Google Drive folder mappings (idempotent seed)
-- ============================================================
insert into drive_mappings (name, folder_id)
select * from (values
  ('Indo Tech House', '1bjK_WmDAmru477EucJKlt8jV7_hJxdBu'),
  ('Bollywood Originals Samples', '10iFV2EXqK6nyUEUywDqjF9hVIDbArfHH'),
  ('Commercial Afro House', '17zbCm776pVQgD0Ges2v4jXoK_kgP2zKI'),
  ('Bollywood Club Mixes', '1Mc832x5R2Q60KQUIz2Gvs36IFwVvb8iI'),
  ('English Party Anthems Originals', '1Ajb_c_8ts3qhN98gbUZCWF8iNVoMsBaG'),
  ('Dandiya & Garba', '19EKKhBo1F0IpzhM7KqBj5C_nlJJClzIw'),
  ('Bollywood Extended Originals', '105gWA2teSeQSs-dwzl3ZEigvL2Jl2C0'),
  ('South Indian Music', '1tpiR5_mqkoCZCYKvNhFQI_9DgbIfcbVY'),
  ('Melodic Techno & Progressive House', '1rbanR3OFJyByu5LhNlEnhsQHBEsCTkX1'),
  ('Commercial Tech House', '1qG-1WNKxooMJ9vr7HvDTeJE88_jjRGxB'),
  ('Dance & Club Music', '1w78ohCXz5GlzoWaptBG5GaXycGD97Ejt'),
  ('Hard Techno', '1plRsZ3-4IGPtlp62rpiKHPdgfnFYRSy6'),
  ('Hip Hop - R&B - Pop', '1F7Wu2MmrwBke2cXFlkZwLo_CVOQ984vC'),
  ('Punjabi Hits', '13RF5oNEnJvcs72XnuYBeiWK3IeCDpKA2'),
  ('Retro English Originals', '1RJG0H5SnIWjA1lqoegK4DWKm9aIyo1yx'),
  ('Wedding Collection', '1GmASEDmxu-dV37xjUUIIkGSjq9MClUln'),
  ('Original Afro House Samples', '1sgfxrXt7foUFg4LaPxKvf3N0-Toe1PP6')
) as v(name, folder_id)
where not exists (select 1 from drive_mappings m where m.folder_id = v.folder_id);

-- Storage buckets (run once — buckets are not SQL-managed, create in Dashboard → Storage):
--   artwork  (public, images)          — product art, banners, QR
--   media    (public, images+audio)    — gallery, banners, preview audio
--   payments (PRIVATE, images)         — customer payment screenshots
--   content  (PRIVATE, audio/zip/img)  — purchased files for protected delivery
