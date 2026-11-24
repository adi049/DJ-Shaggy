import { NavLink, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Disc3, FolderDown, Layers, Boxes, Tags,
  HelpCircle, Settings, LogOut, MessageSquare, ExternalLink, Menu, X, Inbox,
  Home, Images, Users, PenLine,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../../components/UI';
import { cx } from '../../lib/utils';
import Overview from './Overview';
import OrdersAdmin from './OrdersAdmin';
import CustomersAdmin from './CustomersAdmin';
import HomepageAdmin from './HomepageAdmin';
import GalleryAdmin from './GalleryAdmin';
import ProductsAdmin from './ProductsAdmin';
import DriveAdmin from './DriveAdmin';
import TaxonomyAdmin from './TaxonomyAdmin';
import BundlesAdmin from './BundlesAdmin';
import DiscountsAdmin from './DiscountsAdmin';
import FaqsAdmin from './FaqsAdmin';
import MessagesAdmin from './MessagesAdmin';
import PostsAdmin from './PostsAdmin';
import SettingsAdmin from './SettingsAdmin';

const NAV = [
  { to: '', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: 'orders', icon: Package, label: 'Orders' },
  { to: 'customers', icon: Users, label: 'Customers' },
  { to: 'products', icon: Disc3, label: 'Products' },
  { to: 'drive', icon: FolderDown, label: 'Drive Manager' },
  { to: 'homepage', icon: Home, label: 'Homepage' },
  { to: 'gallery', icon: Images, label: 'Gallery' },
  { to: 'taxonomy', icon: Layers, label: 'Genres & Collections' },
  { to: 'bundles', icon: Boxes, label: 'Bundles' },
  { to: 'discounts', icon: Tags, label: 'Coupons' },
  { to: 'faqs', icon: HelpCircle, label: 'FAQs' },
  { to: 'posts', icon: PenLine, label: 'Blog' },
  { to: 'messages', icon: Inbox, label: 'Messages' },
  { to: 'settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  if (loading) return <div className="min-h-screen bg-ink"><Loader label="Checking access…" /></div>;
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Sidebar */}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 w-60 border-r border-line bg-coal transition-transform lg:static lg:translate-x-0',
        navOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo.png" alt="DJ SHAGGY" className="h-8 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Admin</span>
          </Link>
          <button className="text-muted lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="space-y-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={`/admin/${n.to}`}
              end={n.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) => cx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-gold/12 text-gold' : 'text-silver/75 hover:bg-panel2 hover:text-silver'
              )}
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 space-y-1 border-t border-line p-3">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-panel2 hover:text-silver">
            <ExternalLink size={16} /> View store
          </Link>
          <button
            onClick={async () => { await signOut(); navigate('/admin/login'); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-crimson/10 hover:text-crimson"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setNavOpen(true)} className="text-silver" aria-label="Open menu"><Menu size={20} /></button>
          <span className="text-sm font-semibold text-silver">DJ SHAGGY Admin</span>
        </div>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="orders" element={<OrdersAdmin />} />
            <Route path="customers" element={<CustomersAdmin />} />
            <Route path="homepage" element={<HomepageAdmin />} />
            <Route path="gallery" element={<GalleryAdmin />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="drive" element={<DriveAdmin />} />
            <Route path="taxonomy" element={<TaxonomyAdmin />} />
            <Route path="bundles" element={<BundlesAdmin />} />
            <Route path="discounts" element={<DiscountsAdmin />} />
            <Route path="faqs" element={<FaqsAdmin />} />
            <Route path="posts" element={<PostsAdmin />} />
            <Route path="messages" element={<MessagesAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted/70">{hint}</p>}
    </div>
  );
}

export const inputCls =
  'w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm text-silver placeholder:text-muted/50 focus:border-gold/60 focus:outline-none';

export { MessageSquare };
