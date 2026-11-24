import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, AlertTriangle, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

// Persistent bottom mini-player. Renders only while a preview exists.
// Live spectrum bars come from the real audio signal (Web Audio AnalyserNode);
// if the file host blocks analysis (CORS), the player falls back to plain progress.
export default function Player() {
  const { track, playing, toggle, close, audio, error, ready } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState<[number, number]>([0, 0]);
  const [bars, setBars] = useState<number[]>(new Array(18).fill(4));
  const [spectrumOk, setSpectrumOk] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const builtFor = useRef<HTMLAudioElement | null>(null);

  // Progress tracking
  useEffect(() => {
    if (!audio || !track) return;
    const onTime = () => {
      setTime([audio.currentTime || 0, audio.duration || 0]);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [audio, track]);

  // Real-time spectrum from the actual audio element (best effort).
  useEffect(() => {
    if (!audio || !track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    try {
      if (builtFor.current !== audio) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        const src = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        builtFor.current = audio;
        setSpectrumOk(true);
      }
      const analyser = analyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / 18));
        setBars(Array.from({ length: 18 }, (_, i) => Math.max(4, (data[i * step] / 255) * 30)));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      return () => cancelAnimationFrame(rafRef.current);
    } catch {
      setSpectrumOk(false); // CORS or unsupported — plain progress bar remains.
    }
  }, [audio, track]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const fmt = (s: number) => (!isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl sm:bottom-4"
          role="region" aria-label="Audio preview player"
        >
          <div className="rounded-2xl border border-gold/30 bg-coal/95 p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {track.artwork_url
                ? <img src={track.artwork_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                : <span className="h-10 w-10 rounded-lg bg-panel2" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-silver">{track.name}</p>
                {error ? (
                  <p className="flex items-center gap-1 text-[11px] text-crimson"><AlertTriangle size={11} /> Preview unavailable</p>
                ) : (
                  <p className="text-[11px] text-muted">{ready ? `${fmt(time[0])} / ${fmt(time[1])}` : 'Loading…'}</p>
                )}
              </div>
              {/* Real-time spectrum from the playing audio */}
              {spectrumOk && !error && (
                <div className="hidden h-8 items-end gap-[2px] sm:flex" aria-hidden="true">
                  {bars.map((h, i) => (
                    <span key={i} className="w-[3px] rounded-sm bg-gold/80" style={{ height: `${h}px` }} />
                  ))}
                </div>
              )}
              <button
                onClick={toggle}
                disabled={!ready && !error}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                aria-label={playing ? 'Pause preview' : 'Play preview'}
              >
                {!ready && !error ? <Loader2 size={16} className="animate-spin" /> : playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
              </button>
              <button onClick={close} className="shrink-0 rounded-lg p-1.5 text-muted hover:text-silver" aria-label="Close player">
                <X size={16} />
              </button>
            </div>
            <div
              className="mt-2.5 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-line"
              onClick={seek}
              role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (!audio?.duration) return;
                if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
                if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
              }}
            >
              <div className="h-full rounded-full bg-gold transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
