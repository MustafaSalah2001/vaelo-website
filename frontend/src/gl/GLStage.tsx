// The one WebGL canvas for the whole site. It sits fixed behind the page and draws every
// registered element in place. Lazy-loaded, so three.js is not in the first-paint bundle.
import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { registry } from './registry';
import { setMaxAnisotropy } from './textures';
import { tickMotion } from './motion';
import { ImagePlane } from './ImagePlane';
import { RailScene } from './RailScene';
import { ClothScene } from './ClothScene';
import { RingScene } from './RingScene';

const FOV = 35;

/** Perspective camera placed so that 1 world unit = 1 CSS pixel on the z = 0 plane. */
function PixelCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    camera.fov = FOV;
    camera.near = 1;
    camera.far = 20000;
    camera.position.set(0, 0, size.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function MotionTracker() {
  // Negative priority: runs before every object's frame callback, without taking over rendering.
  useFrame((_, dt) => tickMotion(Math.min(dt, 0.1)), -1);
  return null;
}

function Items({ motionScale }: { motionScale: number }) {
  useSyncExternalStore(registry.subscribe, registry.getVersion, registry.getVersion);
  return (
    <>
      {registry.list().map((item) => {
        switch (item.kind) {
          case 'rail':
            return <RailScene key={item.id} item={item} />;
          case 'cloth':
            return <ClothScene key={item.id} item={item} />;
          case 'ring':
            return <RingScene key={item.id} item={item} />;
          default:
            return <ImagePlane key={item.id} item={item} motionScale={motionScale} />;
        }
      })}
    </>
  );
}

export default function GLStage({ onContextLost }: { onContextLost?: () => void }) {
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75));

  // Drop resolution if the device struggles (measured over the first seconds).
  useLayoutEffect(() => {
    let frames = 0;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      frames++;
      const elapsed = performance.now() - start;
      if (elapsed > 2500) {
        if (frames / (elapsed / 1000) < 40) setDpr(1);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Canvas
      flat
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
        gl.domElement.addEventListener('webglcontextlost', () => onContextLost?.(), { once: true });
      }}
      aria-hidden="true"
    >
      <PixelCamera />
      <MotionTracker />
      <hemisphereLight args={['#ffffff', '#b9b3a8', 1.6]} />
      <directionalLight position={[-400, 900, 1200]} intensity={1.4} />
      <Items motionScale={1} />
    </Canvas>
  );
}
