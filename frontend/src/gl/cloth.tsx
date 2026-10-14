import * as THREE from 'three';
import { clothFragment, clothVertex } from './shaders';

export const clothGeometry = new THREE.PlaneGeometry(1, 1, 24, 32);

export function makeClothMaterial(seed = 0, base = '#cfcbc3') {
  return new THREE.ShaderMaterial({
    vertexShader: clothVertex,
    fragmentShader: clothFragment,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      uTex: { value: null },
      uTex2: { value: null },
      uImage: { value: new THREE.Vector2(1, 1) },
      uImage2: { value: new THREE.Vector2(1, 1) },
      uPlane: { value: new THREE.Vector2(1, 1) },
      uMix: { value: 0 },
      uHasTex: { value: 0 },
      uAlpha: { value: 1 },
      uBase: { value: new THREE.Color(base) },
      uDim: { value: 0 },
      uTime: { value: 0 },
      uWind: { value: 0 },
      uSeed: { value: seed },
      uSwing: { value: 6 },
      uMotion: { value: 1 },
    },
  });
}

/** Brushed steel for rails and hangers. Needs the lights in <GLStage>. */
export const steel = new THREE.MeshStandardMaterial({ color: '#8d8a84', metalness: 0.75, roughness: 0.32 });
export const darkWood = new THREE.MeshStandardMaterial({ color: '#3b3229', metalness: 0.05, roughness: 0.6 });

const hookGeometry = new THREE.TorusGeometry(9, 1.6, 8, 24, Math.PI * 1.35);
const stemGeometry = new THREE.CylinderGeometry(1.4, 1.4, 14, 8);
const barGeometry = new THREE.CylinderGeometry(2.6, 2.6, 1, 10);

/** A simple wooden hanger: shoulder bar, stem and hook. `width` is the shoulder width in px. */
export function Hanger({ width, y }: { width: number; y: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={barGeometry} material={darkWood} rotation={[0, 0, Math.PI / 2]} scale={[1, width, 1]} />
      <mesh geometry={stemGeometry} material={steel} position={[0, 9, 0]} />
      <mesh geometry={hookGeometry} material={steel} position={[3, 22, 0]} rotation={[0, 0, -Math.PI * 0.2]} />
    </group>
  );
}
