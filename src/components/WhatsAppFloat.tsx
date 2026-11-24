import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

export default function WhatsAppFloat() {
  const { settings } = useSettings();
  const { number, message } = settings.whatsapp;
  if (!number) return null;

  return (
    <motion.a
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
      className="pulse-ring fixed bottom-24 right-5 z-40 flex items-center justify-center rounded-full bg-jade text-ink shadow-[0_10px_30px_-6px_rgba(47,210,125,0.5)] transition-transform hover:scale-110 active:scale-95 sm:bottom-24"
      style={{ width: 52, height: 52 }}
    >
      <MessageCircle size={24} fill="currentColor" />
    </motion.a>
  );
}
