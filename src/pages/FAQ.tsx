import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import type { Faq } from '../lib/types';
import FaqAccordion from '../components/FaqAccordion';
import { PageHeader, Loader, EmptyState } from '../components/UI';
import { cx } from '../lib/utils';

export default function FAQ() {
  useSEO('FAQ', 'Answers about DJ SHAGGY playlists — formats, payment, verification, delivery and support.');
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('All');

  useEffect(() => {
    apiFetch<Faq[]>('/api/faqs')
      .then(setFaqs)
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  const cats = useMemo(() => ['All', ...new Set(faqs.map((f) => f.category))], [faqs]);
  const shown = cat === 'All' ? faqs : faqs.filter((f) => f.category === cat);

  return (
    <div>
      <PageHeader
        eyebrow="Good to know"
        title="Frequently Asked Questions"
        sub="Everything about formats, payment, verification and delivery. Still stuck? Our support team replies fast."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {loading ? <Loader /> : faqs.length === 0 ? (
          <EmptyState title="FAQs coming soon" />
        ) : (
          <>
            <div className="mb-7 flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cx(
                    'rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                    cat === c ? 'border-gold bg-gold/12 text-gold' : 'border-line text-muted hover:border-gold/40 hover:text-silver'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <FaqAccordion faqs={shown} />
            <p className="mt-8 text-center text-sm text-muted">
              Didn’t find your answer?{' '}
              <Link to="/contact" className="font-semibold text-gold hover:text-gold-soft">Contact support</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
