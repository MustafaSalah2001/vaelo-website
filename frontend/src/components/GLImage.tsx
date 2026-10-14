import { useLayoutEffect, useRef, useState } from 'react';
import { img, srcSet, textureWidth } from '../lib/format';
import { useGLElement } from '../gl/GLProvider';

interface Props {
  src: string | null | undefined;
  alt: string;
  /** Second photo, revealed from the cursor on hover. */
  hoverSrc?: string | null;
  className?: string;
  /** CSS aspect-ratio, e.g. "4 / 5". Omit when the parent sets the size. */
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  parallax?: boolean;
}

/**
 * An image that WebGL draws as a fabric-like surface: it drops in when first seen, drags with
 * scroll speed, ripples under the cursor and reveals a second photo on hover. The real <img>
 * stays in the DOM for layout, accessibility, SEO and as the fallback (reduced motion, no
 * WebGL, or a texture that fails to load).
 */
export function GLImage({ src, alt, hoverSrc, className = '', ratio, sizes = '(min-width: 1024px) 33vw, 90vw', priority, parallax = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Texture resolution follows the element's rendered width (measured once on mount).
  const [widthHint, setWidthHint] = useState<number | null>(null);
  useLayoutEffect(() => {
    const w = ref.current?.getBoundingClientRect().width ?? 0;
    setWidthHint(textureWidth(w || window.innerWidth / 3));
  }, []);
  const { ready } = useGLElement('image', ref, {
    src: src && widthHint ? img(src, widthHint) : undefined,
    src2: hoverSrc && widthHint ? img(hoverSrc, widthHint) : undefined,
    parallax,
  });

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${ready ? '' : 'bg-seam/60'} ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {src && (
        <img
          src={img(src, 1200)}
          srcSet={srcSet(src)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 0 : 1 }}
        />
      )}
      {/* DOM fallback for the hover photo (WebGL handles it when active). */}
      {hoverSrc && !ready && (
        <img
          src={img(hoverSrc, 1200)}
          alt=""
          loading="lazy"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
    </div>
  );
}
