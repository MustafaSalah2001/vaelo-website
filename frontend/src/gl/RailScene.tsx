// Home page hero: the season's pieces hanging on a curved rail. Scrolling through the
// section turns the rail so each garment comes to the front in turn; the pointer and the
// scroll speed blow through the cloth.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FADE_OUT_MS, type GLItem } from "./registry";
import { acquireTexture, imageSize, releaseTexture } from "./textures";
import { damp, motion } from "./motion";
import { clothGeometry, Hanger, makeClothMaterial, steel } from "./cloth";
import { placeOnElement } from "./ImagePlane";

function layout(viewportWidth: number) {
  const mobile = viewportWidth < 768;
  const width = THREE.MathUtils.clamp(
    viewportWidth * (mobile ? 0.48 : 0.2),
    170,
    330,
  );
  const height = width * 1.32;
  const radius = mobile ? 900 : 1300;
  const step = (width * 1.22) / radius;
  // Desktop: right of centre, leaving the left for the headline. Mobile: below the headline.
  const offsetX = viewportWidth >= 1024 ? viewportWidth * 0.14 : 0;
  const offsetY = mobile ? -60 : -height * 0.04;
  return { width, height, radius, step, offsetX, offsetY };
}

export function RailScene({ item }: { item: GLItem }) {
  const size = useThree((s) => s.size);
  const pivot = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const srcs = item.srcs ?? [];
  const count = srcs.length;
  const { width, height, radius, step, offsetX, offsetY } = layout(size.width);

  const materials = useMemo(
    () => srcs.map((_, i) => makeClothMaterial(i * 0.37)),
    [srcs],
  );
  const s = useRef({ angle: 0, wind: 0, alpha: 0 });

  useEffect(() => {
    let alive = true;
    srcs.forEach((src, i) =>
      acquireTexture(src)
        .then((t) => {
          if (!alive) return;
          const u = materials[i].uniforms;
          u.uTex.value = t;
          u.uTex2.value = t;
          u.uImage.value.set(...imageSize(t));
          u.uImage2.value.set(...imageSize(t));
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

  // The rail follows the arc the garments hang on.
  const railGeometry = useMemo(() => {
    const margin = step * 1.5;
    const points: THREE.Vector3[] = [];
    for (let a = -step * 0.6; a <= step * (count - 1) + margin; a += step / 6) {
      points.push(
        new THREE.Vector3(
          radius * Math.sin(a),
          height / 2 + 34,
          radius * Math.cos(a),
        ),
      );
    }
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      Math.max(points.length * 2, 8),
      2.6,
      8,
      false,
    );
  }, [count, step, radius, height]);
  useEffect(() => () => railGeometry.dispose(), [railGeometry]);

  useFrame((frame, dt) => {
    const g = root.current;
    const p = pivot.current;
    if (!g || !p) return;
    const rect = placeOnElement(item, size);
    if (!rect) return;

    // Scroll progress through the tall section the rail is pinned in.
    let progress = 0;
    const section = item.section;
    if (section && item.leavingAt === undefined) {
      const r = section.getBoundingClientRect();
      const travel = Math.max(1, r.height - window.innerHeight);
      progress = THREE.MathUtils.clamp(-r.top / travel, 0, 1);
    }
    const target = progress * (count - 1);
    item.out.activeIndex = Math.round(target);

    const st = s.current;
    st.angle = damp(st.angle, target * step, 4, dt);
    st.wind = damp(
      st.wind,
      Math.min(
        1.4,
        Math.abs(motion.velocity) / 30 +
          Math.abs(motion.pointerX - motion.smoothX) * 3,
      ),
      3,
      dt,
    );
    st.alpha =
      item.leavingAt !== undefined
        ? Math.max(
            0,
            1 - (performance.now() - item.leavingAt) / (FADE_OUT_MS * 0.7),
          )
        : damp(st.alpha, 1, 2, dt);

    g.visible = Math.abs(rect.y) < size.height * 1.2;
    g.position.set(rect.x + offsetX, rect.y + offsetY, -radius);
    p.rotation.y = -st.angle + motion.smoothX * 0.05;
    p.rotation.x = motion.smoothY * 0.03;

    const time = frame.clock.elapsedTime;
    materials.forEach((m, i) => {
      const u = m.uniforms;
      u.uTime.value = time;
      u.uWind.value = st.wind;
      u.uPlane.value.set(width, height);
      u.uAlpha.value = st.alpha;
      // Pieces away from the front fall into shadow.
      const distance = Math.abs(i * step - st.angle) / step;
      u.uDim.value = Math.min(0.42, distance * 0.14);
    });
  });

  return (
    <group ref={root}>
      <group ref={pivot}>
        <mesh geometry={railGeometry} material={steel} />
        {materials.map((material, i) => {
          const a = i * step;
          return (
            <group
              key={i}
              position={[radius * Math.sin(a), 0, radius * Math.cos(a)]}
              rotation={[0, a, 0]}
            >
              <Hanger width={width * 0.86} y={height / 2 + 4} />
              <mesh
                geometry={clothGeometry}
                material={material}
                scale={[width, height, 1]}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
}
