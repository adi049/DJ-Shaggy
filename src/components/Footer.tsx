import { Link, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { Mail, MessageCircle, ShieldCheck, Phone, Instagram } from 'lucide-react';
import Logo from './Logo';
import Eq from './Eq';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  // Discreet admin access: three quick clicks on the small logo mark.
  const clicks = useRef<number[]>([]);
  const onMarkClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 1600), now];
    if (clicks.current.length >= 3) {
      clicks.current = [];
      navigate('/admin/login');
    }
  };

  return (
    <footer className="border-t border-line bg-coal">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo height="h-14" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {settings.site.about_short}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-gold" />
              Manual verification • Secure Drive delivery
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              {[
                { href: settings.site.instagram, icon: Instagram, label: 'Instagram', hover: 'hover:border-magenta/60 hover:text-magenta' },
                { href: `https://wa.me/${settings.whatsapp.number}`, icon: MessageCircle, label: 'WhatsApp', hover: 'hover:border-jade/60 hover:text-jade' },
                { href: `mailto:${settings.site.support_email}`, icon: Mail, label: 'Email', hover: 'hover:border-azure/60 hover:text-azure' },
                { href: `tel:${settings.site.phone_tel}`, icon: Phone, label: 'Call', hover: 'hover:border-gold/60 hover:text-gold' },
              ].filter((s) => s.href).map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={`DJ SHAGGY on ${s.label}`}
                  title={s.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all hover:-translate-y-0.5 ${s.hover}`}
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gold">Explore</h4>
            <ul className="space-y-2.5 text-sm text-silver/80">
              <li><Link className="hover:text-gold-soft" to="/catalogue">Catalogue</Link></li>
              <li><Link className="hover:text-gold-soft" to="/best-sellers">Best Sellers</Link></li>
              <li><Link className="hover:text-gold-soft" to="/genres">Genres</Link></li>
              <li><Link className="hover:text-gold-soft" to="/collections">Collections</Link></li>
              <li><Link className="hover:text-gold-soft" to="/bundles">Bundles</Link></li>
              <li><Link className="hover:text-gold-soft" to="/blog">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gold">Support</h4>
            <ul className="space-y-2.5 text-sm text-silver/80">
              <li><Link className="hover:text-gold-soft" to="/faq">FAQ</Link></li>
              <li><Link className="hover:text-gold-soft" to="/contact">Contact / Support</Link></li>
              <li><Link className="hover:text-gold-soft" to="/track">Track Order</Link></li>
              <li><Link className="hover:text-gold-soft" to="/account">My Account</Link></li>
              <li><Link className="hover:text-gold-soft" to="/about">About DJ SHAGGY</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gold">Get in touch</h4>
            <ul className="space-y-3 text-sm text-silver/80">
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-gold" />
                <a href={`tel:${settings.site.phone_tel}`} className="hover:text-gold-soft">
                  {settings.site.phone_display}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle size={15} className="text-jade" />
                <a
                  href={`https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(settings.whatsapp.message)}`}
                  target="_blank" rel="noreferrer" className="hover:text-gold-soft"
                >
                  WhatsApp {settings.whatsapp.display || settings.site.phone_display}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-azure" />
                <a href={`mailto:${settings.site.support_email}`} className="break-all hover:text-gold-soft">
                  {settings.site.support_email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Instagram size={15} className="text-magenta" />
                <a href={settings.site.instagram} target="_blank" rel="noreferrer" className="hover:text-gold-soft">
                  {settings.site.instagram_handle}
                </a>
              </li>
            </ul>
            <div className="mt-5"><Eq bars={9} height={16} /></div>
          </div>
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="mb-5 text-center text-xs text-muted">
            <span className="gold-text font-display font-semibold tracking-wide">Need a website like this for your brand?</span>{' '}
            WhatsApp{' '}
            <a href="https://wa.me/919076690131?text=Hi!%20I%20want%20a%20website%20built." target="_blank" rel="noreferrer"
              className="font-semibold text-jade transition-colors hover:text-gold-soft">
              +91 90766 90131
            </a>{' '}
            or{' '}
            <a href="tel:+919076690131" className="font-semibold text-silver transition-colors hover:text-gold-soft">
              call us
            </a>{' '}
            — we build premium stores, fast.
          </p>
          <nav className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted" aria-label="Legal">
            <span className="font-bold uppercase tracking-[0.2em] text-gold/70">Legal</span>
            <Link className="hover:text-gold-soft" to="/legal/privacy">Privacy Policy</Link>
            <Link className="hover:text-gold-soft" to="/legal/terms">Terms &amp; Conditions</Link>
            <Link className="hover:text-gold-soft" to="/legal/refunds">Refund Policy</Link>
            <Link className="hover:text-gold-soft" to="/legal/licensing">Music Licensing</Link>
            <Link className="hover:text-gold-soft" to="/legal/copyright">Copyright &amp; Takedown</Link>
          </nav>
        </div>
        <div className="flex items-center justify-between border-t border-line/50 pt-5">
          <p className="text-xs text-muted">© {year} DJ SHAGGY. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p className="hidden text-xs text-muted sm:block">Digital products • No refunds after delivery</p>
            <button
              onClick={onMarkClick}
              className="rounded-full p-1 opacity-30 transition-opacity hover:opacity-70"
              aria-label="DJ SHAGGY mark"
              title="DJ SHAGGY"
            >
              <img src="/logo.png" alt="" className="h-6 w-auto select-none" draggable={false} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
