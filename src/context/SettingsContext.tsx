import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { SiteSettings } from '../lib/types';

export const DEFAULT_SETTINGS: SiteSettings = {
  payment: {
    upi_id: 'djshaggy@upi',
    payee_name: 'DJ SHAGGY',
    qr_url: '',
    instructions:
      'Scan the QR or pay to the UPI ID with the exact order amount. After paying, submit your UTR / transaction reference number and a screenshot of the payment. Orders are verified manually — delivery follows verification.',
  },
  whatsapp: {
    number: '919067162771',
    display: '+91 90671 62771',
    message: 'Hi DJ SHAGGY! I need help with a playlist / order.',
  },
  site: {
    announcement: 'Premium DJ playlists • Manual UPI payment • Drive delivery after verification',
    hero_title: 'Club-Ready Playlists, Curated by DJ SHAGGY',
    hero_subtitle:
      'Premium remix packs and DJ playlists across Bollywood, Punjabi, EDM, Hip-Hop and more — mixed, mastered and delivered straight to your Drive.',
    about_short:
      'DJ SHAGGY is a professional DJ and remix curator crafting high-energy playlists for clubs, weddings and festivals across India.',
    about_long:
      'With years behind the decks at clubs, weddings and festival stages, DJ SHAGGY builds playlists the way a working DJ actually needs them: clean edits, consistent key flow, intro/outro friendly versions and 320kbps masters. Every pack on this store is hand-curated, tagged and tested on real dancefloors — so you can spend less time digging and more time mixing.',
    support_email: 'djshaggycommercialafro@gmail.com',
    phone_display: '+91 90671 62771',
    phone_tel: '+919067162771',
    instagram: 'https://www.instagram.com/itsdjshaggy/',
    instagram_handle: '@itsdjshaggy',
    facebook: 'https://fb.com/sagarshah',
    youtube: 'https://www.youtube.com/djshaggy',
    contact_intro: 'Order help, playlist questions, custom pack requests — reach us any way you like.',
    chat_avatar_url: '/artwork/artist-portrait.webp',
  },
  seo: {
    favicon_url: '',
    title: 'DJ SHAGGY — Premium DJ Playlists & Remix Packs',
    description:
      'Buy premium, club-ready DJ playlists and remix packs by DJ SHAGGY. Bollywood, Punjabi, EDM, Hip-Hop, Retro and House playlists delivered via Google Drive.',
    keywords: 'DJ playlists, remix pack, Bollywood remixes, Punjabi DJ songs, EDM pack, DJ SHAGGY',
    og_image: '/logo.png',
  },
  delivery: {
    note: 'Playlists are delivered via Google Drive links to your email after manual payment verification.',
  },
};

interface Ctx { settings: SiteSettings; loading: boolean; reload: () => Promise<void> }

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loading: true, reload: async () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Settings API failed (${res.status})`);
      setSettings({
        payment: { ...DEFAULT_SETTINGS.payment, ...(data.payment || {}) },
        whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...(data.whatsapp || {}) },
        site: { ...DEFAULT_SETTINGS.site, ...(data.site || {}) },
        seo: { ...DEFAULT_SETTINGS.seo, ...(data.seo || {}) },
        delivery: { ...DEFAULT_SETTINGS.delivery, ...(data.delivery || {}) },
      });
    } catch (e) {
      console.error('settings load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Apply a custom favicon uploaded in admin settings.
  useEffect(() => {
    const fav = settings.seo.favicon_url;
    if (!fav) return;
    const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]') as HTMLLinkElement | null;
    if (link) link.href = fav;
  }, [settings.seo.favicon_url]);

  return (
    <SettingsContext.Provider value={{ settings, loading, reload: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
