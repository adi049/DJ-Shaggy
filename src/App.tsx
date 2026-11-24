import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Loader } from './components/UI';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import ErrorBoundary from './components/ErrorBoundary';
import Player from './components/Player';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import WhatsAppFloat from './components/WhatsAppFloat';
import InstagramFloat from './components/InstagramFloat';

import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import BestSellers from './pages/BestSellers';
import Genres from './pages/Genres';
import GenreDetail from './pages/GenreDetail';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import Bundles from './pages/Bundles';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import TrackOrder from './pages/TrackOrder';
import Account from './pages/Account';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import LegalPage, { LEGAL_DOCS } from './pages/Legal';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/AdminLogin';
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      {!isAdmin && <Navbar />}
      <main className="flex-1">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/best-sellers" element={<BestSellers />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/genres/:slug" element={<GenreDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:slug" element={<CollectionDetail />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="/playlist/:slug" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderConfirmation />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/account" element={<Account />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/legal/privacy" element={<LegalPage doc={LEGAL_DOCS.privacy} />} />
          <Route path="/legal/terms" element={<LegalPage doc={LEGAL_DOCS.terms} />} />
          <Route path="/legal/refunds" element={<LegalPage doc={LEGAL_DOCS.refunds} />} />
          <Route path="/legal/licensing" element={<LegalPage doc={LEGAL_DOCS.licensing} />} />
          <Route path="/legal/copyright" element={<LegalPage doc={LEGAL_DOCS.copyright} />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={
            <Suspense fallback={<div className="min-h-screen bg-ink"><Loader label="Loading admin…" /></div>}>
              <AdminLayout />
            </Suspense>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </motion.div>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <InstagramFloat />}
      {!isAdmin && <WhatsAppFloat />}
      {!isAdmin && <Chatbot />}
      {!isAdmin && <Player />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <PlayerProvider>
              <ScrollToTop />
              <ErrorBoundary>
                <Shell />
              </ErrorBoundary>
            </PlayerProvider>
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
