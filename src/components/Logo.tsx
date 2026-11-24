import { Link } from 'react-router-dom';
import { cx } from '../lib/utils';

export default function Logo({ className, to = '/', height = 'h-10' }: {
  className?: string; to?: string; height?: string;
}) {
  return (
    <Link to={to} className={cx('inline-flex items-center gap-3', className)} aria-label="DJ SHAGGY home">
      <img
        src="/logo.png"
        alt="DJ SHAGGY official logo"
        className={cx(height, 'w-auto object-contain')}
        style={{ filter: 'drop-shadow(0 2px 10px rgba(216,180,90,0.25))' }}
      />
    </Link>
  );
}
