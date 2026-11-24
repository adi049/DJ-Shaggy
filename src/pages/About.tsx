import { Link } from 'react-router-dom';
import {
  Disc3, Sparkles, ShieldCheck, ArrowRight, MapPin, Briefcase,
  Music2, Instagram,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../hooks/useSEO';
import Reveal from '../components/Reveal';
import Eq from '../components/Eq';
import { PageHeader } from '../components/UI';

const FREELANCE_VENUES = [
  'The Daily All Day', 'The Irish House', '3 Musketeers',
  'The Rasta Cafe', 'Frozen Monkey', 'The Spoon Fuel',
];

const SKILLS = [
  'Crowd Engagement', 'Beatmatching', 'Genre Mixing', 'Music Production', 'Professionalism',
];

const SOCIALS = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/sagarshahhh/', hover: 'hover:border-magenta/60 hover:text-magenta' },
];

export default function About() {
  const { settings } = useSettings();
  useSEO('About DJ SHAGGY', settings.site.about_short);

  return (
    <div>
      <PageHeader eyebrow="The man behind the decks" title={<>About <span className="gold-text">DJ SHAGGY</span></>} />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[440px_1fr] lg:gap-14">
          {/* Portrait — official artist photo */}
          <Reveal>
            <div className="group relative">
              <div className="overflow-hidden rounded-3xl border border-line">
                <img
                  src="/artwork/artist-portrait.webp"
                  srcSet="/artwork/artist-portrait-600.webp 600w, /artwork/artist-portrait.webp 900w"
                  sizes="(min-width: 1024px) 440px, 100vw"
                  alt="DJ SHAGGY — official artist portrait"
                  loading="eager"
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-ink/70 px-3 py-1.5 text-[11px] font-semibold text-gold backdrop-blur">
                    <MapPin size={12} /> Pune, India
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/70 px-3 py-1.5 text-[11px] font-semibold text-silver backdrop-blur">
                    <Disc3 size={12} className="text-gold" /> 6+ Years
                  </span>
                </div>
              </div>
              <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 ring-1 ring-gold/40 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </Reveal>

          {/* Profile */}
          <Reveal delay={0.12}>
            <div className="flex items-center gap-3">
              <Eq bars={5} height={14} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Artist profile</span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">DJ SHAGGY</h2>

            <blockquote className="mt-5 border-l-2 border-gold pl-4 font-display text-base italic leading-relaxed text-silver sm:text-lg">
              “DJ Shaggy is a talented and experienced DJ with over 6 years of experience, specializing in
              House, Hip Hop, Commercial and Bollywood music for events.”
            </blockquote>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted sm:text-[15px]">
              <p>{settings.site.about_long}</p>
              <p>
                When you buy from DJ SHAGGY you are buying directly from the artist. Payments are handled
                personally over UPI, every order is verified by a human, and your playlists arrive via
                Google Drive — exactly the folders you paid for, nothing more, nothing less.
              </p>
            </div>

            {/* Residency */}
            <div className="mt-7 rounded-2xl border border-gold/25 bg-gradient-to-br from-panel2 to-panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Briefcase size={18} />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-silver">Resident DJ — Farmaaish Lounge &amp; Bar</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-jade">2019 — Present</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Experienced in managing diverse crowds, seamless genre mixing and creating dynamic
                dance floor experiences night after night.
              </p>
            </div>

            {/* Freelance venues */}
            <div className="mt-7">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-gold">
                <Music2 size={13} /> Freelance venues
              </p>
              <div className="flex flex-wrap gap-2">
                {FREELANCE_VENUES.map((v) => (
                  <span key={v} className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs font-medium text-silver/85 transition-colors hover:border-gold/40 hover:text-gold-soft">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="mt-7">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-gold">
                <Sparkles size={13} /> Professional skills
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <span key={s} className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold-soft">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">Follow</span>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`DJ SHAGGY on ${s.label} (opens in new tab)`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-all hover:-translate-y-0.5 ${s.hover}`}
                >
                  <s.icon size={17} />
                </a>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Values + CTA (existing content preserved) */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Disc3, t: 'Crafted, not scraped', d: 'Every track is selected and checked by ear.' },
            { icon: Sparkles, t: 'Always current', d: 'New volumes follow the charts and the floor.' },
            { icon: ShieldCheck, t: 'Honest checkout', d: 'Manual verification keeps both sides safe.' },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.08}>
              <div className="card-hover h-full rounded-2xl border border-line bg-panel p-5">
                <f.icon size={18} className="text-gold" />
                <p className="mt-2.5 text-sm font-bold text-silver">{f.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <Link
            to="/catalogue"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-display text-sm font-bold text-ink transition-transform hover:scale-[1.03] active:scale-95"
          >
            Explore the catalogue <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
