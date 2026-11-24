import { cx } from '../lib/utils';

export default function Eq({
  bars = 5,
  className,
  color = '#d8b45a',
  height = 18,
  animated = true,
}: {
  bars?: number;
  className?: string;
  color?: string;
  height?: number;
  animated?: boolean;
}) {
  return (
    <div className={cx('flex items-end gap-[3px]', className)} style={{ height }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={animated ? 'eq-bar' : undefined}
          style={{
            width: 3,
            height: '100%',
            borderRadius: 2,
            background: color,
            animationDelay: `${i * 0.13}s`,
            animationDuration: `${0.9 + (i % 3) * 0.25}s`,
            transform: animated ? undefined : `scaleY(${0.3 + ((i * 37) % 60) / 100})`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
