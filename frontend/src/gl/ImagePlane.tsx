import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FADE_OUT_MS, type GLItem } from './registry';
import { acquireTexture, imageSize, releaseTexture } from './textures';
import { damp, motion } from './motion';
import { imageFragment, imageVertex } from './shaders';

export const planeGeometry = new THREE.PlaneGeometry(1, 1, 28, 28);

/** Viewport rect → canvas pixel space (origin at centre, y up). Returns null if detached. */
export function placeOnElement(item: GLItem, size: { width: number; height: number }) {
  if (item.leavingAt === undefined) {
    const r = item.el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && !item.el.isConnected) return item.lastRect ?? null;
    item.lastRect = {
      x: r.left + r.width / 2 - size.width / 2,
      y: size.height / 2 - (r.top + r.height / 2),
      width: r.width,
      height: r.height,
    };
  }
  return item.lastRect ?? null;
}

export const isOnScreen = (rect: { y: number; height: number }, viewportHeight: number, margin = 200) =>
  Math.abs(rect.y) - rect.height / 2 < viewportHeight / 2 + margin;

export function ImagePlane({ item, motionScale }: { item: GLItem; motionScale: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const state = useRef({ reveal: 0, alpha: 1, hover: 0, swap: 0, ready: false, revealed: false });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: imageVertex,
        fragmentShader: imageFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTex: { value: null },
          uTex2: { value: null },
          uImage: { value: new THREE.Vector2(1, 1) },
          uImage2: { value: new THREE.Vector2(1, 1) },
          uHasTex2: { value: 0 },
          uPlane: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uVelocity: { value: 0 },
          uHover: { value: 0 },
          uSwap: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uReveal: { value: 0 },
          uAlpha: { value: 1 },
          uParallax: { value: 0 },
          uMotion: { value: motionScale },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Load (and later release) the main and hover textures.
  useEffect(() => {
    let alive = true;
    const src = item.src;
    const src2 = item.src2;
    if (!src) return;

    acquireTexture(src)
      .then((t) => {
        if (!alive) return;
        material.uniforms.uTex.value = t;
        material.uniforms.uImage.value.set(...imageSize(t));
        state.current.ready = true;
        item.onReady?.(true);
      })
      .catch(() => alive && item.onReady?.(false));

    if (src2) {
      acquireTexture(src2)
        .then((t) => {
          if (!alive) return;
          material.uniforms.uTex2.value = t;
          material.uniforms.uImage2.value.set(...imageSize(t));
          material.uniforms.uHasTex2.value = 1;
        })
        .catch(() => undefined); // hover photo is optional
    }

    return () => {
      alive = false;
      releaseTexture(src);
      releaseTexture(src2);
    };
  }, [item, item.src, item.src2, material]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((frame, dt) => {
    const m = mesh.current;
    if (!m) return;
    const rect = placeOnElement(item, size);
    const s = state.current;
    const u = material.uniforms;

    if (!rect || !s.ready || !isOnScreen(rect, size.height)) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(rect.x, rect.y, 0);
    m.scale.set(rect.width, rect.height, 1);

    // First time on screen: play the cloth-drop entrance once.
    if (!s.revealed && Math.abs(rect.y) < size.height / 2 + rect.height * 0.25) s.revealed = true;
    s.reveal = s.revealed ? damp(s.reveal, 1, motionScale ? 2.6 : 50, dt) : 0;

    if (item.leavingAt !== undefined) {
      const t = (performance.now() - item.leavingAt) / FADE_OUT_MS;
      s.alpha = Math.max(0, 1 - t * 1.4);
    }

    s.hover = damp(s.hover, item.input.hover, 6, dt);
    s.swap = damp(s.swap, item.input.hover, 3.2, dt);

    u.uPlane.value.set(rect.width, rect.height);
    u.uTime.value = frame.clock.elapsedTime;
    u.uVelocity.value = motion.velocity;
    u.uHover.value = s.hover;
    u.uSwap.value = s.swap;
    u.uMouse.value.set(
      damp(u.uMouse.value.x, item.input.u, 8, dt),
      damp(u.uMouse.value.y, item.input.v, 8, dt),
    );
    u.uReveal.value = s.reveal;
    u.uAlpha.value = s.alpha;
    // -1 when the image is at the bottom of the viewport, +1 at the top.
    u.uParallax.value = item.parallax ? THREE.MathUtils.clamp(rect.y / (size.height / 2 + rect.height / 2), -1, 1) * motionScale : 0;
  });

  return <mesh ref={mesh} geometry={planeGeometry} material={material} visible={false} />;
}
