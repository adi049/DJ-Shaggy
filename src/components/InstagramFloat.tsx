import { Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

export default function InstagramFloat() {
  const { settings } = useSettings();
  const url = settings.site.instagram;
  if (!url) return null; // fully configurable — hidden if admin clears it

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Follow DJ SHAGGY on Instagram"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.45, type: 'spring', stiffness: 200 }}
      className="pulse-ring-magenta fixed bottom-40 right-5 z-40 flex items-center justify-center rounded-full bg-gradient-to-br from-magenta to-[#a21caf] text-white shadow-[0_10px_30px_-6px_rgba(243,79,208,0.5)] transition-transform hover:scale-110 hover:-rotate-6 active:scale-95"
      style={{ width: 52, height: 52 }}
    >
      <Instagram size={24} />
    </motion.a>
  );
}
