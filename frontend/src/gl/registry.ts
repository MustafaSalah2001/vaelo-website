// The bridge between the DOM and the single WebGL canvas.
//
// Every visual on the site is laid out by normal HTML/CSS. Components register their element
// here; the canvas reads each element's on-screen rectangle every frame and draws a 3D object
// in exactly that place. Layout, accessibility and SEO stay in the DOM; the look is WebGL.

export type GLKind = 'image' | 'rail' | 'cloth' | 'ring';

/** Live interaction state written by DOM event handlers and read by the canvas every frame. */
export interface GLInput {
  /** 1 while the pointer is over the element. */
  hover: number;
  /** Pointer position inside the element, 0..1 (v is up). */
  u: number;
  v: number;
  /** Horizontal drag velocity in px/frame, decays in the canvas. */
  dragVelocity: number;
  /** Accumulated drag offset in px. */
  drag: number;
  dragging: boolean;
}

export interface GLItem {
  id: number;
  kind: GLKind;
  el: HTMLElement;
  /** Main texture URL (already sized). */
  src?: string;
  /** Second texture, shown on hover (image) or the next colour (cloth). */
  src2?: string;
  /** Extra textures for scenes (rail, ring). */
  srcs?: string[];
  /** Scenes that follow a taller scroll section read progress from this element. */
  section?: HTMLElement | null;
  parallax: boolean;
  input: GLInput;
  /** Incremented when src/srcs change so the canvas can react without re-mounting. */
  revision: number;
  /** Set when the DOM element leaves (route change / unmount); the canvas fades it out. */
  leavingAt?: number;
  lastRect?: { x: number; y: number; width: number; height: number };
  onReady?: (ok: boolean) => void;
  /** Free-form scene data (e.g. active index the DOM wants to know). */
  out: { activeIndex: number };
}

type NewItem = Omit<GLItem, 'id' | 'input' | 'revision' | 'out' | 'parallax'> & { parallax?: boolean };

const items = new Map<number, GLItem>();
const listeners = new Set<() => void>();
let nextId = 1;
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const FADE_OUT_MS = 650;

export function register(item: NewItem): GLItem {
  const full: GLItem = {
    parallax: false,
    ...item,
    id: nextId++,
    revision: 0,
    out: { activeIndex: 0 },
    input: { hover: 0, u: 0.5, v: 0.5, dragVelocity: 0, drag: 0, dragging: false },
  };
  items.set(full.id, full);
  emit();
  return full;
}

/** Starts the fade-out; the item is removed once the canvas has had time to animate it. */
export function release(item: GLItem) {
  if (item.leavingAt !== undefined) return;
  item.leavingAt = performance.now();
  item.onReady = undefined;
  emit();
  window.setTimeout(() => {
    items.delete(item.id);
    emit();
  }, FADE_OUT_MS);
}

export function update(item: GLItem, patch: Partial<Pick<GLItem, 'src' | 'src2' | 'srcs'>>) {
  Object.assign(item, patch);
  item.revision++;
}

export const registry = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  getVersion: () => version,
  list: () => Array.from(items.values()),
  /** How many registered textures have finished loading (drives the first-load progress). */
  progress: { loaded: 0, requested: 0 },
};

/** Attach the standard pointer handlers that feed GLInput. Returns a cleanup function. */
export function bindPointer(item: GLItem, el: HTMLElement, { drag = false } = {}) {
  let lastX = 0;
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    item.input.u = (e.clientX - r.left) / r.width;
    item.input.v = 1 - (e.clientY - r.top) / r.height;
    if (drag && item.input.dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      item.input.drag += dx;
      item.input.dragVelocity = dx;
    }
  };
  const enter = () => (item.input.hover = 1);
  const leave = () => {
    item.input.hover = 0;
    item.input.dragging = false;
  };
  const down = (e: PointerEvent) => {
    if (!drag) return;
    item.input.dragging = true;
    lastX = e.clientX;
    el.setPointerCapture?.(e.pointerId);
  };
  const up = () => (item.input.dragging = false);

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerenter', enter);
    el.removeEventListener('pointerleave', leave);
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
