// Lookbooks index: every photo from every season on a slowly turning ring. Drag to spin it;
// scrolling past it turns it too.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FADE_OUT_MS, type GLItem } from './registry';
import { acquireTexture, imageSize, releaseTexture } from './textures';
import { damp, motion } from './motion';
import { clothGeometry, makeClothMaterial } from './cloth';
import { placeOnElement } from './ImagePlane';

const camDir = new THREE.Vector3();

export function RingScene({ item }: { item: GLItem }) {
  const size = useThree((s) => s.size);
  const root = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const srcs = item.srcs ?? [];
  const count = Math.max(srcs.length, 1);
  const materials = useMemo(() => srcs.map((_, i) => makeClothMaterial(i * 0.53)), [srcs]);
  const st = useRef({ spin: 0, drag: 0, alpha: 0 });

  useEffect(() => {
    let alive = true;
    srcs.forEach((src, i) =>
      acquireTexture(src)
        .then((t) => {
          if (!alive) return;
          const u = materials[i].uniforms;
          u.uTex.value = t;
          u.uImage.value.set(...imageSize(t));
          u.uHasTex.value = 1;
          if (i === 0) item.onReady?.(true);
        })
        .catch(() => i === 0 && item.onReady?.(false)),
    );
    return () => {
      alive = false;
      srcs.forEach(releaseTexture);
      materials.forEach((m) => m.dispose());
    };
  }, [srcs, materials, item]);

  useFrame((frame, dt) => {
    const g = root.current;
    const r = ring.current;
    if (!g || !r) return;
    const rect = placeOnElement(item, size);
    if (!rect) return;
    const s = st.current;

    const radius = Math.min(rect.width * 0.46, 760);
    const panelW = Math.min(((Math.PI * 2 * radius) / count) * 0.8, rect.height * 0.5);
    const panelH = panelW * 1.34;

    // Idle spin + drag (with inertia) + a little from scrolling past.
    const input = item.input;
    s.spin += dt * 0.06 + (input.dragging ? 0 : input.dragVelocity * 0.0016);
    if (!input.dragging) input.dragVelocity = damp(input.dragVelocity, 0, 2, dt);
    s.drag = damp(s.drag, input.drag * 0.004, 8, dt);
    const scrollTurn = (rect.y / size.height) * 0.6;
    s.alpha = item.leavingAt !== undefined ? Math.max(0, 1 - (performance.now() - item.leavingAt) / (FADE_OUT_MS * 0.7)) : damp(s.alpha, 1, 2, dt);

    g.visible = Math.abs(rect.y) - rect.height / 2 < size.height / 2 + 200;
    g.position.set(rect.x, rect.y, -radius);
    r.rotation.y = s.spin + s.drag + scrollTurn;
    r.rotation.x = 0.08 + motion.smoothY * 0.04;

    const time = frame.clock.elapsedTime;
    r.children.forEach((child, i) => {
      const a = (i / count) * Math.PI * 2;
      child.position.set(radius * Math.sin(a), 0, radius * Math.cos(a));
      child.rotation.set(0, a, 0);
      child.scale.set(panelW, panelH, 1);
      const u = materials[i]?.uniforms;
      if (!u) return;
      // Dim panels that face away from the viewer.
      child.getWorldDirection(camDir);
      u.uDim.value = THREE.MathUtils.clamp(0.55 - camDir.z * 0.55, 0, 0.7);
      u.uTime.value = time;
      u.uWind.value = Math.min(1, Math.abs(input.dragVelocity) / 20 + Math.abs(motion.velocity) / 50);
      u.uSwing.value = 0;
      u.uPlane.value.set(panelW, panelH);
      u.uAlpha.value = s.alpha;
    });
  });

  return (
    <group ref={root}>
      <group ref={ring}>
        {materials.map((m, i) => (
          <mesh key={i} geometry={clothGeometry} material={m} />
        ))}
      </group>
    </group>
  );
}
