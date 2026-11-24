import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Faq } from '../lib/types';
import { cx } from '../lib/utils';

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {faqs.map((f) => (
        <div key={f.id} className="overflow-hidden rounded-xl border border-line bg-panel">
          <button
            onClick={() => setOpen(open === f.id ? null : f.id)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            aria-expanded={open === f.id}
          >
            <span className="text-sm font-semibold text-silver">{f.question}</span>
            <ChevronDown size={17} className={cx('shrink-0 text-gold transition-transform', open === f.id && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {open === f.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <p className="whitespace-pre-line border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">
                  {f.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
