import { useState } from 'react';
import { cx } from '../lib/utils';

// Image with a smooth fade-in once loaded. Respects reduced motion via .img-fade CSS.
export default function Img({ className, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      decoding="async"
      {...props}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      className={cx(className, 'img-fade', loaded && 'loaded')}
    />
  );
}
