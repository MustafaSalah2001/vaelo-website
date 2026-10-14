import { useRef } from 'react';
import { useGLElement } from '../gl/GLProvider';
import { img, srcSet } from '../lib/format';

/** The product photo as a hanging garment. Drag turns it; the DOM photo is the fallback. */
export function ClothViewer({ src, alt }: { src: string | undefined; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { ready, enabled } = useGLElement('cloth', ref, { src: src ? img(src, 1400) : undefined, drag: true });

  return (
    <figure>
      <div
        ref={ref}
        className={`relative aspect-[4/5] touch-pan-y select-none overflow-hidden ${ready ? 'cursor-grab active:cursor-grabbing' : 'bg-seam/60'}`}
        role="img"
        aria-label={alt}
      >
        {src && (
          <img
            src={img(src, 1200)}
            srcSet={srcSet(src)}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: ready ? 0 : 1 }}
          />
        )}
      </div>
      {enabled && ready && <figcaption className="t-small mt-3">Drag the garment to turn it on its hanger.</figcaption>}
    </figure>
  );
}
