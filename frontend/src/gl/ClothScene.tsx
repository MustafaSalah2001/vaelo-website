// Product page: the garment's photo hangs as a piece of cloth on a short rail. Drag to turn it,
// move the pointer to stir it, and choose another colour to watch the new photo flow down it.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FADE_OUT_MS, type GLItem } from './registry';
import { acquireTexture, imageSize, releaseTexture } from './textures';
import { damp, motion } from './motion';
import { clothGeometry, Hanger, makeClothMaterial, steel } from './cloth';
import { placeOnElement } from './ImagePlane';

const railGeometry = new THREE.CylinderGeometry(3, 3, 1, 12);

export function ClothScene({ item }: { item: GLItem }) {
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group>(null);
  const garment = useRef<THREE.Group>(null);
  const material = useMemo(() => makeClothMaterial(0.2), []);
  const st = useRef({ shown: '', pending: '', mix: 0, rot: 0, wind: 0, alpha: 0, revision: -1 });

  useEffect(() => () => material.dispose(), [material]);

  // Release whatever is still held when the scene unmounts.
  useEffect(
    () => () => {
      releaseTexture(st.current.shown);
      releaseTexture(st.current.pending);
    },
    [],
  );

  useFrame((frame, dt) => {
    const g = group.current;
    const body = garment.current;
    if (!g || !body) return;
    const rect = placeOnElement(item, size);
    if (!rect) return;
    const s = st.current;
    const u = material.uniforms;

    // A new colour was chosen: load it as the second texture and flow it down the cloth.
    // Rapid clicks wait for the current transition to finish (the check simply runs again next frame).
    if (item.revision !== s.revision && item.src && item.src !== s.shown && !s.pending && s.mix === 0) {
      s.revision = item.revision;
      const next = item.src;
      const first = !s.shown;
      s.pending = next;
      acquireTexture(next)
        .then((t) => {
          if (s.pending !== next) return releaseTexture(next);
          if (first) {
            u.uTex.value = t;
            u.uImage.value.set(...imageSize(t));
            u.uHasTex.value = 1;
            s.shown = next;
            s.pending = '';
            item.onReady?.(true);
          } else {
            u.uTex2.value = t;
            u.uImage2.value.set(...imageSize(t));
            s.mix = 0.0001;
          }
        })
        .catch(() => {
          if (first) item.onReady?.(false);
          s.pending = '';
        });
    }

    if (s.mix > 0) {
      s.mix = Math.min(1, s.mix + dt * 1.1);
      if (s.mix >= 1) {
        // Swap: the new photo becomes the base texture.
        releaseTexture(s.shown);
        u.uTex.value = u.uTex2.value;
        u.uImage.value.copy(u.uImage2.value);
        s.shown = s.pending;
        s.pending = '';
        s.mix = 0;
      }
    }

    // Drag turns the garment on its hanger; it settles back when released.
    const input = item.input;
    if (!input.dragging) input.drag = damp(input.drag, 0, 2.2, dt);
    input.dragVelocity = damp(input.dragVelocity, 0, 5, dt);
    const targetRot = THREE.MathUtils.clamp(input.drag * 0.006, -1.2, 1.2) + (input.hover ? (input.u - 0.5) * 0.25 : 0);
    s.rot = damp(s.rot, targetRot, 6, dt);
    s.wind = damp(
      s.wind,
      Math.min(1.6, Math.abs(input.dragVelocity) / 12 + Math.abs(motion.velocity) / 40 + input.hover * 0.25),
      3,
      dt,
    );
    s.alpha =
      item.leavingAt !== undefined ? Math.max(0, 1 - (performance.now() - item.leavingAt) / (FADE_OUT_MS * 0.7)) : damp(s.alpha, 1, 3, dt);

    const w = rect.width * 0.74;
    const h = Math.min(rect.height * 0.8, w * 1.34);
    g.position.set(rect.x, rect.y, 0);
    body.rotation.y = s.rot;
    body.position.y = rect.height * 0.42 - 34 - h / 2;
    body.scale.setScalar(1);

    u.uPlane.value.set(w, h);
    u.uTime.value = frame.clock.elapsedTime;
    u.uWind.value = s.wind;
    u.uMix.value = s.mix;
    u.uAlpha.value = s.alpha;
    u.uSwing.value = 4;

    const cloth = body.children[1] as THREE.Mesh;
    cloth.scale.set(w, h, 1);
    const hanger = body.children[0] as THREE.Group;
    hanger.position.y = h / 2 + 4;
    (hanger.children[0] as THREE.Mesh).scale.set(1, w * 0.86, 1); // shoulder bar follows the garment width
    const rail = g.children[0] as THREE.Mesh;
    rail.position.y = rect.height * 0.42;
    rail.scale.set(1, rect.width * 0.9, 1);
    g.visible = s.alpha > 0.01 && Math.abs(rect.y) < size.height;
  });

  return (
    <group ref={group}>
      <mesh geometry={railGeometry} material={steel} rotation={[0, 0, Math.PI / 2]} />
      <group ref={garment}>
        <Hanger width={258} y={0} />
        <mesh geometry={clothGeometry} material={material} />
      </group>
    </group>
  );
}
