import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { JSX } from 'react';
import {
  ArrowRight, Disc3, ShieldCheck, Download, CreditCard,
  Headphones, Sparkles, Package, MessageCircle, Layers, Megaphone,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../hooks/useSEO';
import type { Product, Genre, Collection, Bundle, Faq, HomeSection, Banner, GalleryImage } from '../lib/types';
import ProductCard from '../components/ProductCard';
import BundleCard from '../components/BundleCard';
import Reveal from '../components/Reveal';
import Eq from '../components/Eq';
import { SectionHead, SkeletonGrid } from '../components/UI';
import FaqAccordion from '../components/FaqAccordion';
import Img from '../components/Img';

const DEFAULT_ORDER = ['collections', 'bestsellers', 'genres', 'bundles', 'featured', 'gallery', 'about', 'how', 'faq', 'cta'];

export default function Home() {
  const { settings } = useSettings();
  useSEO(settings.seo.title, settings.seo.description, settings.seo.og_image);

  const [best, setBest] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Product[]>('/api/products?bestseller=1&limit=8').catch(() => []),
      apiFetch<Product[]>('/api/products?featured=1&limit=4').catch(() => []),
      apiFetch<Genre[]>('/api/genres').catch(() => []),
      apiFetch<Collection[]>('/api/collections').catch(() => []),
      apiFetch<Bundle[]>('/api/bundles').catch(() => []),
      apiFetch<Faq[]>('/api/faqs').catch(() => []),
      apiFetch<GalleryImage[]>('/api/gallery').catch(() => []),
      apiFetch<{ sections: HomeSection[]; banners: Banner[] }>('/api/homepage').catch(() => ({ sections: [], banners: [] })),
    ]).then(([b, f, g, c, bu, fa, ga, hp]) => {
      setBest(b); setFeatured(f); setGenres(g); setCollections(c); setBundles(bu);
      setFaqs(fa.slice(0, 4)); setGallery(ga);
      setSections(hp.sections); setBanners(hp.banners.filter((x) => x.image_url));
    }).finally(() => setLoading(false));
  }, []);

  // Banner slideshow rotation
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  const sec = (key: string) => sections.find((s) => s.key === key);
  const heroSec = sec('hero');
  const heroTitle = heroSec?.title || settings.site.hero_title;
  const heroSub = heroSec?.subtitle || settings.site.hero_subtitle;
  const heroCfg = heroSec?.config || {};
  const cta1 = { label: heroCfg.cta1_label || 'Browse the Catalogue', link: heroCfg.cta1_link || '/catalogue' };
  const cta2 = { label: heroCfg.cta2_label || 'Best Sellers', link: heroCfg.cta2_link || '/best-sellers' };
  const activeBanner = banners[slide % Math.max(banners.length, 1)];

  // Sections are rendered in the admin-configured order; hidden ones are already filtered server-side.
  const orderedKeys = sections.length
    ? sections.filter((s) => s.key !== 'hero').map((s) => s.key)
    : DEFAULT_ORDER;

  const sectionContent: Record<string, JSX.Element | null> = {
    collections: collections.length > 0 ? (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHead
            eyebrow="Curated for every set"
            title={sec('collections')?.title || 'Featured Collections'}
            sub={sec('collections')?.subtitle}
            right={<Link to="/collections" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">All collections <ArrowRight size={15} /></Link>}
          />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {collections.slice(0, 4).map((c, i) => (
            <Reveal key={c.id} delay={i * 0.07}>
              <Link to={`/collections/${c.slug}`} className="card-hover group relative block overflow-hidden rounded-2xl border border-line">
                <div className="aspect-[4/3] overflow-hidden bg-panel">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.name} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-gold-soft">{c.name}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-silver/70">{c.description}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    ) : null,

    bestsellers: best.length > 0 ? (
      <section className="border-y border-line bg-coal">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <SectionHead
              eyebrow="Crowd favourites"
              title={sec('bestsellers')?.title || 'Best-Selling Playlists'}
              sub={sec('bestsellers')?.subtitle}
              right={<Link to="/best-sellers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">View all <ArrowRight size={15} /></Link>}
            />
          </Reveal>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {best.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 3) * 0.07}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    genres: genres.length > 0 ? (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHead
            eyebrow="Find your sound"
            title={sec('genres')?.title || 'Browse by Genre'}
            sub={sec('genres')?.subtitle}
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {genres.map((g, i) => (
            <Reveal key={g.id} delay={Math.min(i, 5) * 0.05}>
              <Link
                to={`/genres/${g.slug}`}
                className="card-hover group flex flex-col items-start gap-3 rounded-2xl border border-line bg-panel p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${g.accent}1f`, color: g.accent }}>
                  <Layers size={18} />
                </span>
                <span>
                  <span className="block font-display text-sm font-bold text-silver group-hover:text-gold-soft">{g.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted">{g.description}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    ) : null,

    bundles: bundles.length > 0 ? (
      <section className="border-y border-line bg-coal">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <SectionHead
              eyebrow="Bigger crates, better value"
              title={sec('bundles')?.title || 'Value Bundles'}
              sub={sec('bundles')?.subtitle}
              right={<Link to="/bundles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">All bundles <ArrowRight size={15} /></Link>}
            />
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bundles.slice(0, 3).map((b, i) => (
              <Reveal key={b.id} delay={i * 0.08}>
                <BundleCard bundle={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    featured: featured.length > 0 ? (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHead
            eyebrow="Hand-picked by SHAGGY"
            title={sec('featured')?.title || 'Featured This Month'}
            sub={sec('featured')?.subtitle}
            right={<Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">Full catalogue <ArrowRight size={15} /></Link>}
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 3) * 0.07}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    ) : null,

    gallery: gallery.length > 0 ? (
      <section className="border-y border-line bg-coal noise relative">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <SectionHead
              eyebrow="From the booth"
              title={sec('gallery')?.title || 'On the Floor'}
              sub={sec('gallery')?.subtitle}
            />
          </Reveal>
          {/* Cohesive editorial grid: lead image spans wide, the rest tile evenly */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
            {gallery.slice(0, 5).map((g, i) => (
              <Reveal key={g.id} delay={Math.min(i, 4) * 0.07}
                className={i === 0 ? 'col-span-2 lg:row-span-2' : ''}>
                <figure className="card-hover group relative h-full overflow-hidden rounded-2xl border border-line bg-panel">
                  <div className={`h-full overflow-hidden ${i === 0 ? 'aspect-[4/3] lg:aspect-auto lg:min-h-[320px]' : ''}`}>
                    <Img src={g.image_url} alt={g.alt || g.title} loading="lazy"
                      className={`h-full w-full object-cover group-hover:scale-105 ${i === 0 || g.image_url.includes('artist-portrait') ? 'object-top' : 'object-center'}`} />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  {g.title && (
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                      <span className="text-xs font-semibold leading-snug text-silver sm:text-sm">{g.title}</span>
                      <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-gold sm:block" />
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    about: (
      <section className="border-y border-line bg-coal noise relative">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-line">
                <img
                  src="/artwork/artist-portrait.webp"
                  srcSet="/artwork/artist-portrait-600.webp 600w, /artwork/artist-portrait.webp 900w"
                  sizes="(min-width: 1024px) 560px, 100vw"
                  alt="DJ SHAGGY — official artist portrait"
                  loading="lazy"
                  className="w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -right-3 rounded-xl border border-gold/30 bg-panel px-4 py-3 shadow-xl sm:-right-5">
                <div className="flex items-center gap-2.5">
                  <Disc3 size={22} className="spin-slow text-gold" />
                  <div>
                    <p className="font-display text-sm font-bold text-silver">Resident @ Farmaaish Lounge &amp; Bar</p>
                    <p className="text-[11px] text-muted">Pune, India • 6+ years</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex items-center gap-3">
              <Eq bars={4} height={13} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">About DJ SHAGGY</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-4xl">
              Playlists built by a DJ who <span className="gold-text">actually plays them</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-[15px]">{settings.site.about_long}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Disc3, t: 'Clean edits', d: 'Intro/outro friendly versions' },
                { icon: Sparkles, t: 'Fresh drops', d: 'New packs every month' },
                { icon: ShieldCheck, t: 'Tested live', d: 'Proven on real dancefloors' },
              ].map((f) => (
                <div key={f.t} className="rounded-xl border border-line bg-panel p-3.5">
                  <f.icon size={18} className="text-gold" />
                  <p className="mt-2 text-xs font-bold text-silver">{f.t}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{f.d}</p>
                </div>
              ))}
            </div>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">
              Read the full story <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </section>
    ),

    how: (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <SectionHead eyebrow="Simple & transparent" title={sec('how')?.title || 'How Ordering Works'} />
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Package, t: '1. Choose your playlists', d: 'Browse the catalogue, preview details and add playlists or bundles to your cart.' },
            { icon: CreditCard, t: '2. Pay via UPI', d: 'Pay the exact amount to our UPI ID and submit your UTR / transaction reference at checkout.' },
            { icon: Download, t: '3. Get Drive delivery', d: 'We manually verify your payment, then email Google Drive links for exactly what you bought.' },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.1}>
              <div className="card-hover h-full rounded-2xl border border-line bg-panel p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-gold">
                  <s.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-silver">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    ),

    faq: faqs.length > 0 ? (
      <section className="border-y border-line bg-coal">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <SectionHead
              eyebrow="Good to know"
              title={sec('faq')?.title || 'Frequently Asked Questions'}
              right={<Link to="/faq" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-soft">All FAQs <ArrowRight size={15} /></Link>}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <FaqAccordion faqs={faqs} />
          </Reveal>
        </div>
      </section>
    ) : null,

    cta: (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-panel2 via-panel to-coal p-8 text-center sm:p-14">
            <Eq bars={11} height={26} className="mx-auto mb-5 justify-center" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Need a hand picking the <span className="gold-text">right pack?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
              Chat with the SHAGGY assistant, message us on WhatsApp or drop a line — real humans, real answers.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(settings.whatsapp.message)}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-jade px-6 py-3 text-sm font-bold text-ink transition-transform hover:scale-[1.03] active:scale-95"
              >
                <MessageCircle size={16} /> WhatsApp us
              </a>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-6 py-3 text-sm font-semibold text-silver transition-colors hover:border-gold/50 hover:text-gold-soft">
                Contact support <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    ),
  };

  return (
    <div>
      {/* ---------------- HERO with rotating promo banners ---------------- */}
      <section className="noise relative overflow-hidden border-b border-line">
        <div className="absolute inset-0">
          <img src="/artwork/hero-bg.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          {banners.map((b, i) => (
            <img
              key={b.id}
              src={b.image_url}
              alt=""
              aria-hidden={i !== slide}
              className={`banner-bg absolute inset-0 h-full w-full object-cover ${i === slide ? 'opacity-40' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/80 to-ink" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-24 pt-14 text-center sm:px-6 sm:pb-28 sm:pt-20">
          <motion.img
            src="/logo.png"
            alt="DJ SHAGGY"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-52 sm:w-72"
            style={{ filter: 'drop-shadow(0 10px 40px rgba(216,180,90,0.3))' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            {activeBanner?.title && (
              <Link
                to={activeBanner.cta_link || '/catalogue'}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-ink/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold backdrop-blur transition-all hover:border-gold hover:bg-gold/10"
              >
                <Megaphone size={12} />
                <span key={activeBanner.id} className="banner-bg">{activeBanner.title}</span>
                <ArrowRight size={12} />
              </Link>
            )}
            <div className="mt-2 flex items-center justify-center gap-3">
              <Eq bars={5} height={16} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">
                Premium DJ Playlist Store
              </span>
              <Eq bars={5} height={16} />
            </div>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl sm:leading-[1.1]">
              {heroTitle.split(',').map((part, i, arr) => (
                <span key={i}>{i < arr.length - 1 ? <span className="gold-text">{part},</span> : ` ${part}`}</span>
              ))}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {heroSub}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to={cta1.link}
              className="shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-deep via-gold to-gold-deep px-6 py-3.5 font-display text-sm font-bold text-ink transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Headphones size={17} /> {cta1.label}
            </Link>
            <Link
              to={cta2.link}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel/80 px-6 py-3.5 font-display text-sm font-semibold text-silver backdrop-blur transition-colors hover:border-gold/50 hover:text-gold-soft"
            >
              {cta2.label} <ArrowRight size={16} />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted"
          >
            <span className="inline-flex items-center gap-1.5"><Disc3 size={14} className="text-gold" /> 320kbps club-ready masters</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-jade" /> Manual payment verification</span>
            <span className="inline-flex items-center gap-1.5"><Download size={14} className="text-azure" /> Google Drive delivery</span>
          </motion.div>

          {banners.length > 1 && (
            <div className="mt-10 flex items-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setSlide(i)}
                  aria-label={`Show banner: ${b.title || i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-7 bg-gold' : 'w-2.5 bg-line hover:bg-muted'}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SkeletonGrid count={8} />
        </section>
      ) : (
        <>
          {orderedKeys.map((key) => (
            <div key={key}>{sectionContent[key] ?? null}</div>
          ))}
        </>
      )}
    </div>
  );
}
