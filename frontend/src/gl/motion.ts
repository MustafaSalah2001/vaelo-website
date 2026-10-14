// Page-wide motion signals shared by every WebGL object: smoothed scroll velocity and the
// pointer position. Updated once per frame by <MotionTracker/> in the canvas.

export const motion = {
  scrollY: 0,
  /** Smoothed scroll speed in px per frame (positive = scrolling down). */
  velocity: 0,
  /** Pointer in normalised device coordinates, -1..1. */
  pointerX: 0,
  pointerY: 0,
  /** Smoothed pointer for gentle follow effects. */
  smoothX: 0,
  smoothY: 0,
};

let lastY = typeof window !== 'undefined' ? window.scrollY : 0;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      motion.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      motion.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}

/** Call once per frame. `dt` is seconds since the last frame. */
export function tickMotion(dt: number) {
  const y = window.scrollY;
  // Clamp so a jump (route change scrolls to top) doesn't fling every image.
  const raw = Math.max(-120, Math.min(120, y - lastY));
  lastY = y;
  motion.scrollY = y;
  // Frame-rate independent smoothing (~0.15 per frame at 60 fps).
  const k = 1 - Math.pow(0.85, dt * 60);
  motion.velocity += (raw - motion.velocity) * k;
  const p = 1 - Math.pow(0.92, dt * 60);
  motion.smoothX += (motion.pointerX - motion.smoothX) * p;
  motion.smoothY += (motion.pointerY - motion.smoothY) * p;
}

/** Exponential approach helper, frame-rate independent. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
