import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';

export interface PlayerTrack {
  name: string;
  url: string;
  artwork_url?: string;
  slug?: string;
}

interface PlayerCtx {
  track: PlayerTrack | null;
  playing: boolean;
  play: (t: PlayerTrack) => void;
  toggle: () => void;
  close: () => void;
  audio: HTMLAudioElement | null;
  error: boolean;
  ready: boolean;
}

const Ctx = createContext<PlayerCtx>({
  track: null, playing: false, play: () => {}, toggle: () => {}, close: () => {},
  audio: null, error: false, ready: false,
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  const ensureAudio = () => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'metadata';
      el.crossOrigin = 'anonymous';
      el.addEventListener('ended', () => setPlaying(false));
      el.addEventListener('error', () => { setError(true); setPlaying(false); });
      el.addEventListener('canplay', () => setReady(true));
      audioRef.current = el;
    }
    return audioRef.current;
  };

  const play = useCallback((t: PlayerTrack) => {
    const el = ensureAudio();
    if (track?.url === t.url) {
      // Same track: toggle.
      if (el.paused) { el.play().then(() => setPlaying(true)).catch(() => setError(true)); }
      else { el.pause(); setPlaying(false); }
      return;
    }
    setError(false);
    setReady(false);
    setTrack(t);
    el.src = t.url;
    el.play().then(() => setPlaying(true)).catch(() => { setError(true); setPlaying(false); });
  }, [track]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    if (el.paused) { el.play().then(() => setPlaying(true)).catch(() => setError(true)); }
    else { el.pause(); setPlaying(false); }
  }, [track]);

  const close = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setTrack(null);
    setError(false);
  }, []);

  const value = useMemo<PlayerCtx>(() => ({
    track, playing, play, toggle, close,
    audio: audioRef.current, error, ready,
  }), [track, playing, play, toggle, close, error, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlayer = () => useContext(Ctx);
