import { useSettings } from '../context/SettingsContext';
import { useSEO } from '../hooks/useSEO';
import { PageHeader } from '../components/UI';

interface Section { h: string; body: string }
interface LegalDoc { slug: string; eyebrow: string; title: string; intro: string; sections: Section[] }

const CONTACT = 'djshaggycommercialafro@gmail.com';

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    intro: 'How DJ SHAGGY collects, uses and protects your information when you browse or buy from this store.',
    sections: [
      { h: 'What we collect', body: 'When you place an order we collect your name, email address and phone number, the items you purchased, your payment reference (UTR) and, if you provide it, a payment screenshot. When you contact support we keep the message content and your contact details. We do not store card or banking credentials — payments are made by you directly in your own UPI app.' },
      { h: 'How we use it', body: 'Your details are used only to verify your payment, deliver your purchased playlists, provide order support and prevent fraud. We do not sell, rent or share your personal data with advertisers.' },
      { h: 'Where it is stored', body: 'Order and contact data is stored in our Supabase (PostgreSQL) database with access restricted to the store operator. Payment screenshots are stored in a private storage bucket and are only viewable by the admin through short-lived signed links. Delivery links are emailed through our transactional email provider (Resend, when configured) and hosted on Google Drive.' },
      { h: 'Your rights', body: `You can request a copy, correction or deletion of your personal data at any time by emailing ${CONTACT} from the address used on the order. Deleting order records also removes our ability to re-send your purchases.` },
      { h: 'Cookies & analytics', body: 'This store does not use advertising trackers. Only strictly necessary browser storage is used (your cart contents and preferences).' },
      { h: 'Contact', body: `Questions about this policy: ${CONTACT} · WhatsApp +91 90671 62771. DJ SHAGGY operates from Pune, India.` },
    ],
  },
  terms: {
    slug: 'terms',
    eyebrow: 'Legal',
    title: 'Terms & Conditions',
    intro: 'The agreement between you and DJ SHAGGY when using this website or purchasing digital playlists.',
    sections: [
      { h: 'Products', body: 'We sell digital DJ playlists and remix packs delivered as Google Drive links. Each product page describes its contents (track count, format and notes). Prices are in Indian Rupees and may change without notice; the price at the time of your order applies to that order.' },
      { h: 'Orders & payment', body: 'Orders are placed with your name, email and phone number. Payment is manual UPI/bank transfer to the account shown at checkout, followed by submission of your UTR/transaction reference. Every payment is verified manually by our team before delivery. Submitting false payment proofs or references will result in order rejection and may lead to a permanent block.' },
      { h: 'Delivery', body: 'After payment verification, download links for exactly the products you purchased are emailed to your checkout email. Delivery is digital only; nothing is shipped physically.' },
      { h: 'Acceptable use', body: 'Accounts and purchases are for the purchasing customer. Do not share order links publicly, attempt to access other customers\u2019 orders, abuse the chat assistant, or attack the website. We may refuse service for abuse or fraud.' },
      { h: 'Liability', body: 'The store is provided “as is”. Our total liability for any claim is limited to the amount you paid for the order in question.' },
      { h: 'Changes', body: 'We may update these terms; the version live at the time of your order applies to it. Questions: ' + CONTACT + '.' },
    ],
  },
  refunds: {
    slug: 'refunds',
    eyebrow: 'Legal',
    title: 'Refund Policy',
    intro: 'Clear rules for digital products — please read before ordering.',
    sections: [
      { h: 'Digital goods', body: 'Playlists are digital goods delivered via Google Drive. Once an order has been verified and delivered, it cannot be returned or refunded, because digital content cannot be “sent back”.' },
      { h: 'Before delivery', body: 'If your payment cannot be verified, or we are unable to deliver what you purchased, you are not charged for the undelivered order — if money was already transferred, it is refunded in full to the same UPI account, usually within 3–5 working days.' },
      { h: 'Duplicate or mistaken payments', body: 'If you accidentally pay twice for the same order, the extra payment is refunded after verification. Contact support with both UTR numbers.' },
      { h: 'How to request', body: `Email ${CONTACT} or WhatsApp +91 90671 62771 with your Order ID (DJS-…) and payment reference. Refunds, where applicable, are processed manually — you will receive a confirmation when done.` },
    ],
  },
  licensing: {
    slug: 'licensing',
    eyebrow: 'Legal',
    title: 'Music Licensing & Usage Terms',
    intro: 'What your purchase of a DJ SHAGGY playlist or remix pack allows you to do.',
    sections: [
      { h: 'What you get', body: 'A non-exclusive, non-transferable licence to use the purchased playlist files in live DJ performances (clubs, weddings, private events) and in your personal practice.' },
      { h: 'What is not allowed', body: 'You may not resell, redistribute, share, upload or make the files or their download links available to others (including file-sharing, Telegram groups, or “free packs”), claim the remixes as your own productions, or use them in commercial releases, sync placements or streaming distribution without written permission.' },
      { h: 'Underlying rights', body: 'Tracks may contain remixes/edits of commercially released music. Ownership of the original recordings and compositions remains with their respective rights holders. Purchasing a pack does not transfer any copyright. Public performance of commercial music typically requires venue/broadcast licensing (e.g. PPL/IPRS in India) which is the performer\u2019s or venue\u2019s responsibility.' },
      { h: 'Link confidentiality', body: 'Google Drive delivery links are personal to the buyer. Publicly sharing a link may result in access being revoked without refund.' },
      { h: 'Questions', body: `For extended/commercial licensing enquiries contact ${CONTACT}.` },
    ],
  },
  copyright: {
    slug: 'copyright',
    eyebrow: 'Legal',
    title: 'Copyright & Takedown',
    intro: 'Respect for rights holders — how to report content that concerns you.',
    sections: [
      { h: 'Our position', body: 'DJ SHAGGY respects the intellectual property of artists, labels and producers. Material in this store is curated for DJ performance use. If you are a rights holder and believe any content here infringes your rights, we will act promptly.' },
      { h: 'Takedown requests', body: `Email ${CONTACT} with subject “Takedown”, including: your name and role/company, the specific product or content concerned (link or name), proof of ownership or authorization, and your contact details. Valid requests are typically actioned within 72 hours — content is removed from sale and deliveries.` },
      { h: 'Counter-notice', body: 'If your content was removed and you believe that was a mistake, reply with your counter-notice and supporting proof for review.' },
      { h: 'Repeat concerns', body: 'We aim to resolve every genuine concern directly and quickly — please reach out before pursuing formal channels.' },
    ],
  },
};

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const { settings } = useSettings();
  useSEO(doc.title, doc.intro);
  const email = settings.site.support_email || CONTACT;

  return (
    <div>
      <PageHeader eyebrow={doc.eyebrow} title={doc.title} sub={doc.intro} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-4">
          {doc.sections.map((s) => (
            <section key={s.h} className="rounded-2xl border border-line bg-panel p-6">
              <h2 className="font-display text-base font-bold text-gold-soft">{s.h}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.body.replaceAll(CONTACT, email)}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-center text-[11px] text-muted">
          Last updated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · DJ SHAGGY, Pune, India ·{' '}
          <a className="text-gold hover:underline" href={`mailto:${email}`}>{email}</a>
        </p>
      </div>
    </div>
  );
}
