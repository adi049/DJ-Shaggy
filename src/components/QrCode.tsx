import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ text, size = 232 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current || !text) return;
    QRCode.toCanvas(ref.current, text, {
      width: size,
      margin: 4, // full quiet zone — phone cameras need it to detect the QR at all
      color: { dark: '#0a0a0b', light: '#ffffff' },
      errorCorrectionLevel: 'H', // most forgiving for screen glare/angles
    }).catch(() => {});
  }, [text, size]);

  return (
    <div className="inline-block rounded-xl bg-white p-4 shadow-[0_0_0_1px_rgba(216,180,90,0.4),0_12px_40px_-12px_rgba(216,180,90,0.35)]">
      <canvas ref={ref} aria-label="UPI payment QR code" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
