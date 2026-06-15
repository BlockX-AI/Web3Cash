import { useEffect, useRef } from 'react';
import createGlobe, { type COBEOptions } from 'cobe';

type Props = {
  className?: string;
};

export default function CobeGlobe({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let size = Math.max(container.clientWidth, 200);

    const options: COBEOptions = {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 0,
      theta: 0.25,
      dark: 0,
      diffuse: 1.3,
      mapSamples: 20000,
      mapBrightness: 10,
      baseColor: [0.85, 0.82, 0.95],
      markerColor: [0.337, 0.298, 0.549],
      glowColor: [0.78, 0.75, 0.92],
      markers: [
        { location: [37.7595, -122.4367], size: 0.05 },
        { location: [40.7128, -74.006], size: 0.06 },
        { location: [51.5074, -0.1278], size: 0.05 },
        { location: [35.6762, 139.6503], size: 0.05 },
        { location: [1.3521, 103.8198], size: 0.04 },
        { location: [-33.8688, 151.2093], size: 0.04 },
        { location: [19.076, 72.8777], size: 0.05 },
        { location: [-23.5505, -46.6333], size: 0.05 },
        { location: [55.7558, 37.6173], size: 0.04 },
        { location: [25.2048, 55.2708], size: 0.04 },
      ],
    };

    const globe = createGlobe(canvas, options);

    let phi = 0;
    let rafId = 0;
    const tick = () => {
      phi += 0.005;
      globe.update({
        phi,
        width: size * dpr,
        height: size * dpr,
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onResize = () => {
      const next = container.clientWidth;
      if (next > 0) size = next;
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
      try {
        globe.destroy();
      } catch {
        // ignore
      }
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
