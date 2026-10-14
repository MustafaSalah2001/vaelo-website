// Reference-counted texture cache. Several DOM images can share one texture (the same photo
// appears on the shop grid, the rail and a lookbook), and textures are freed when nothing
// on screen uses them any more, so GPU memory follows what is actually visible.
import * as THREE from 'three';
import { registry } from './registry';

interface Entry {
  promise: Promise<THREE.Texture>;
  texture?: THREE.Texture;
  refs: number;
  disposeTimer?: number;
}

const cache = new Map<string, Entry>();
const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

let maxAnisotropy = 4;
export const setMaxAnisotropy = (n: number) => (maxAnisotropy = Math.min(n, 8));

export function acquireTexture(url: string): Promise<THREE.Texture> {
  let entry = cache.get(url);
  if (entry) {
    entry.refs++;
    if (entry.disposeTimer) {
      window.clearTimeout(entry.disposeTimer);
      entry.disposeTimer = undefined;
    }
    return entry.promise;
  }

  registry.progress.requested++;
  const promise = loader.loadAsync(url).then(
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      const e = cache.get(url);
      if (e) e.texture = texture;
      registry.progress.loaded++;
      return texture;
    },
    (err) => {
      registry.progress.loaded++;
      cache.delete(url); // allow a retry on a later mount
      throw err;
    },
  );
  entry = { promise, refs: 1 };
  cache.set(url, entry);
  return promise;
}

export function releaseTexture(url: string | undefined) {
  if (!url) return;
  const entry = cache.get(url);
  if (!entry) return;
  entry.refs--;
  if (entry.refs > 0) return;
  // Short grace period: navigating back to a page reuses its textures without a reload.
  entry.disposeTimer = window.setTimeout(() => {
    if (entry.refs <= 0) {
      entry.texture?.dispose();
      cache.delete(url);
    }
  }, 8000);
}

/** Pixel size of a loaded texture's image. */
export function imageSize(texture: THREE.Texture): [number, number] {
  const image = texture.image as { width?: number; height?: number } | undefined;
  return [image?.width || 1, image?.height || 1];
}
