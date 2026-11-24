import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { apiFetch } from '../lib/api';
import type { Genre } from '../lib/types';
import { cx } from '../lib/utils';

const LINKS = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/best-sellers', label: 'Best Sellers' },
  { to: '/collections', label: 'Collections' },
  { to: '/bundles', label: 'Bundles' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Support' },
];

export default function Navbar() {
  const cart = useCart();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); setGenreOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    apiFetch<Genre[]>('/api/genres').then(setGenres).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40">
      {settings.site.announcement && (
        <div className="bg-gold px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          {settings.site.announcement}
        </div>
      )}
      <nav className={cx(
        'border-b border-line bg-ink/85 backdrop-blur-xl transition-shadow',
        scrolled && 'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.9)]'
      )}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo height="h-11" />

          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.slice(0, 2).map((l) => <NavItem key={l.to} {...l} />)}
            <div
              className="relative"
              onMouseEnter={() => setGenreOpen(true)}
              onMouseLeave={() => setGenreOpen(false)}
              onFocus={() => setGenreOpen(true)}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setGenreOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setGenreOpen(false); }}
            >
              <NavLink
                to="/genres"
                aria-expanded={genreOpen}
                aria-haspopup="true"
                className={({ isActive }) => cx(
                  'nav-link inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'active-link text-gold' : 'text-silver/80 hover:text-gold-soft'
                )}
              >
                Genres <ChevronDown size={14} className={cx('transition-transform', genreOpen && 'rotate-180')} />
              </NavLink>
              <AnimatePresence>
                {genreOpen && genres.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 top-full w-60 rounded-xl border border-line bg-panel p-2 shadow-2xl"
                  >
                    {genres.map((g) => (
                      <Link
                        key={g.id}
                        to={`/genres/${g.slug}`}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-silver/85 transition-colors hover:bg-panel2 hover:text-gold-soft"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: g.accent }} />
                        {g.name}
                      </Link>
                    ))}
                    <div className="my-1 h-px bg-line" />
                    <Link to="/genres" className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gold hover:bg-panel2">
                      View all genres
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {LINKS.slice(2).map((l) => <NavItem key={l.to} {...l} />)}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm font-medium text-silver transition-colors hover:border-gold/50 hover:text-gold-soft"
              aria-label={`Cart with ${cart.count} items`}
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline">Cart</span>
              {cart.count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-ink">
                  {cart.count}
                </span>
              )}
            </Link>
            <button
              className="rounded-lg border border-line bg-panel p-2 text-silver lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {[{ to: '/', label: 'Home' }, ...LINKS.slice(0, 2), { to: '/genres', label: 'Genres' }, ...LINKS.slice(2)].map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => cx(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-panel2 text-gold' : 'text-silver/85 hover:bg-panel2'
                    )}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cx(
        'nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'active-link text-gold' : 'text-silver/80 hover:text-gold-soft'
      )}
    >
      {label}
    </NavLink>
  );
}
