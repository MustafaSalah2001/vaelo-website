import { useEffect, useState } from 'react';
import { registry } from '../gl/registry';
import { useGLEnabled } from '../gl/GLProvider';
import { Wordmark } from './Layout';

/**
 * Covers the very first paint while the first photographs reach the GPU, so the page appears
 * whole instead of image by image. Shows real progress and never blocks for more than 4 s.
 */
export function FirstLoad() {
  const gl = useGLEnabled();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!gl) {
      setDone(true);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      const { loaded, requested } = registry.progress;
      const p = requested ? loaded / requested : 0;
      setProgress(p);
      const elapsed = performance.now() - start;
      if ((requested >= 3 && p >= 0.8) || (requested === 0 && elapsed > 1200) || elapsed > 4000) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gl]);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(id);
  }, [done]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-stone transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      role="status"
      aria-live="polite"
    >
      <Wordmark className="text-[2.4rem]" />
      <div className="h-px w-48 bg-seam">
        <div className="h-px bg-cobalt transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <span className="sr-only">Loading photographs, {Math.round(progress * 100)} percent</span>
    </div>
  );
}
