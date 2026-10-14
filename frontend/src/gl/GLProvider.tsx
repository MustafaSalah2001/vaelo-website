import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useIsPresent } from 'framer-motion';
import { bindPointer, register, release, update, type GLItem, type GLKind } from './registry';
import { useReducedMotion } from '../hooks/useMedia';

const GLStage = lazy(() => import('./GLStage'));

let webglCache: boolean | undefined;
export function hasWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    webglCache = !!ctx;
    ctx?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

const GLContext = createContext(false);

/** True when images are being drawn by WebGL (supported, motion allowed, context alive). */
export const useGLEnabled = () => useContext(GLContext);

export function GLProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [lost, setLost] = useState(false);
  const enabled = !reduced && !lost && hasWebGL();

  return (
    <GLContext.Provider value={enabled}>
      {enabled && (
        <Suspense fallback={null}>
          <GLStage onContextLost={() => setLost(true)} />
        </Suspense>
      )}
      {children}
    </GLContext.Provider>
  );
}

interface SceneOptions {
  src?: string;
  src2?: string;
  srcs?: string[];
  section?: RefObject<HTMLElement | null>;
  parallax?: boolean;
  drag?: boolean;
}

/**
 * Registers a DOM element with the canvas for as long as it is mounted and present.
 * Returns `ready` (true once WebGL is drawing it, so the DOM fallback can hide) and the item.
 */
export function useGLElement(kind: GLKind, ref: RefObject<HTMLElement | null>, options: SceneOptions) {
  const enabled = useGLEnabled();
  const isPresent = useIsPresent();
  const [ready, setReady] = useState(false);
  const itemRef = useRef<GLItem | null>(null);
  const srcsKey = options.srcs?.join('|') ?? '';

  // Register on mount (and when the image set changes for images and scenes).
  useEffect(() => {
    const el = ref.current;
    const hasSource = kind === 'image' || kind === 'cloth' ? !!options.src : !!options.srcs?.length;
    if (!enabled || !el || !hasSource) return;
    const item = register({
      kind,
      el,
      src: options.src,
      src2: options.src2,
      srcs: options.srcs,
      section: options.section?.current ?? null,
      parallax: options.parallax,
      onReady: (ok) => setReady(ok),
    });
    itemRef.current = item;
    const unbind = bindPointer(item, el, { drag: options.drag });
    return () => {
      unbind();
      release(item);
      itemRef.current = null;
      setReady(false);
    };
    // Cloth swaps its src without re-registering (see below), so it is not a dependency for cloth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, kind, srcsKey, kind === 'cloth' ? !!options.src : options.src, options.src2]);

  // Cloth: a colour change updates the live item so the canvas can animate between photos.
  useEffect(() => {
    if (kind === 'cloth' && itemRef.current && options.src && itemRef.current.src !== options.src) {
      update(itemRef.current, { src: options.src });
    }
  }, [kind, options.src]);

  // Route change: start fading the WebGL object out together with the DOM exit animation.
  useEffect(() => {
    if (!isPresent && itemRef.current) release(itemRef.current);
  }, [isPresent]);

  return { ready: enabled && ready, enabled, item: itemRef };
}
