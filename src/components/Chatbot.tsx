import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { inr } from '../lib/utils';

interface ChatProduct {
  slug: string; name: string; price: number; original_price?: number | null;
  artwork_url?: string | null; track_count?: number | null; genre?: string | null;
  bundle?: boolean;
}
interface Msg { role: 'user' | 'assistant'; content: string; products?: ChatProduct[] }

const QUICK = ['Best sellers', 'Under ₹500', 'Wedding playlists', 'How does payment work?', 'How do I get my playlists?'];

export default function Chatbot() {
  const { settings } = useSettings();
  const avatar = settings.site.chat_avatar_url || '/artwork/artist-portrait.webp';
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'assistant',
    content: "Hey! I'm the DJ SHAGGY assistant. Ask me about playlists, genres, prices, bundles, payment or delivery — I only answer from the live catalogue.",
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const res = await apiFetch<{ reply: string; products?: ChatProduct[] }>('/api/chat', {
        method: 'POST',
        body: { message, history: msgs.slice(-6) },
      });
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply, products: res.products }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'assistant', content: e.message || 'Chat is unavailable right now. Please use the Contact page.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher — real DJ photo avatar */}
      <motion.button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat assistant' : 'Chat with the DJ SHAGGY assistant'}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.35, type: 'spring', stiffness: 200 }}
        className="group fixed bottom-5 left-5 z-40 transition-transform hover:scale-105 active:scale-95"
      >
        <span className={`relative block h-14 w-14 overflow-hidden rounded-full border-2 border-gold/70 shadow-[0_8px_28px_-6px_rgba(216,180,90,0.55)] ${open ? '' : 'float-y'}`}>
          {open ? (
            <span className="flex h-full w-full items-center justify-center bg-panel text-gold">
              <X size={22} />
            </span>
          ) : (
            <img src={avatar} alt="DJ SHAGGY" className="h-full w-full object-cover object-top" />
          )}
        </span>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-ink bg-jade" />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-[92px] left-4 right-4 z-40 flex h-[500px] max-h-[72vh] flex-col overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] sm:left-5 sm:right-auto sm:w-[384px]"
            role="dialog"
            aria-label="DJ SHAGGY assistant chat"
          >
            {/* Header with real photo */}
            <div className="relative flex items-center gap-3 border-b border-line bg-gradient-to-r from-coal via-panel2 to-coal px-4 py-3.5">
              <span className="relative">
                <img src={avatar} alt="" className="h-11 w-11 rounded-full border border-gold/50 object-cover object-top" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-panel bg-jade" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wide">DJ SHAGGY</p>
                <p className="truncate text-[11px] text-muted">Store assistant · answers from the live catalogue</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel hover:text-silver"
                aria-label="Close chat"
              >
                <X size={17} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex items-end justify-start gap-2'}
                >
                  {m.role === 'assistant' && (
                    <img src={avatar} alt="" className="mb-0.5 h-6 w-6 shrink-0 rounded-full border border-gold/40 object-cover object-top" />
                  )}
                  <div className={m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-gold px-3.5 py-2.5 text-sm font-medium text-ink shadow-[0_6px_20px_-8px_rgba(216,180,90,0.5)]'
                    : 'max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-panel2 px-3.5 py-2.5 text-sm text-silver'
                  }>
                    <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                    {!!m.products?.length && (
                      <div className="mt-2.5 space-y-2">
                        {m.products.map((p) => (
                          <Link
                            key={p.slug}
                            to={p.bundle ? '/bundles' : `/playlist/${p.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg border border-line bg-ink/50 p-2 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                          >
                            {p.artwork_url
                              ? <img src={p.artwork_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                              : <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gold/15 text-[10px] font-bold text-gold">PK</span>}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-silver">{p.name}</span>
                              <span className="text-[11px] text-muted">
                                {p.genre ? `${p.genre} • ` : ''}{p.track_count ? `${p.track_count} tracks • ` : ''}{inr(p.price)}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {busy && (
                <div className="flex items-end gap-2">
                  <img src={avatar} alt="" className="mb-0.5 h-6 w-6 rounded-full border border-gold/40 object-cover object-top" />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-panel2 px-4 py-3">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gold" />
                    <span className="sr-only">Assistant is typing</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {msgs.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="rounded-full border border-line bg-ink px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-gold/50 hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex items-center gap-2 border-t border-line bg-coal p-3"
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about playlists, payment, delivery…"
                aria-label="Message the assistant"
                className="flex-1 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm text-silver placeholder:text-muted/60 focus:border-gold/60 focus:outline-none"
                maxLength={400}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-xl bg-gold p-2.5 text-ink transition-all hover:bg-gold-soft active:scale-95 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
