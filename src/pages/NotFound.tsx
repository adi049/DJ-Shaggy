import { Link } from 'react-router-dom';
import Eq from '../components/Eq';
import { useSEO } from '../hooks/useSEO';

export default function NotFound() {
  useSEO('Page not found');
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
      <Eq bars={9} height={34} />
      <h1 className="mt-6 font-display text-5xl font-bold gold-text">404</h1>
      <p className="mt-3 text-sm text-muted">That track isn’t in the crate. The page you’re looking for doesn’t exist or was moved.</p>
      <Link to="/" className="mt-7 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-ink hover:bg-gold-soft">
        Back to home
      </Link>
    </div>
  );
}
