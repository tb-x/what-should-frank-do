// Shared look for every model: three-step toon shading, cached materials, rounded boxes and
// small canvas textures. Everything is built in code; there are no model or picture files.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ======== materials ======== */

const GRADIENT = (() => {
  const t = new THREE.DataTexture(new Uint8Array([120, 200, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const mats = new Map();

// A toon material for a colour, shared between all meshes that use the same colour and options.
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT, ...opts }));
  return mats.get(key);
}

// A mesh at (x, y, z) that casts and receives shadows. `color` may also be a material.
export function part(geo, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(geo, color && color.isMaterial ? color : mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  return g;
}

/* ======== geometry ======== */

export function box(w, h, d, r = 0.02) {
  const rr = Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
  return new RoundedBoxGeometry(w, h, d, 2, rr);
}

export const sphere = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
export const capsule = (r, len, seg = 8) => new THREE.CapsuleGeometry(r, len, 4, seg);
export const cyl = (rt, rb, h, seg = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

/* ======== canvas textures ======== */

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// A flat sign or picture facing +z, `w` by `h` metres.
export function picture(w, h, draw, px = 256) {
  const tex = canvasTex(px, Math.round(px * h / w), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshToonMaterial({ map: tex, gradientMap: GRADIENT }));
  m.receiveShadow = true;
  return m;
}

export const RAINBOW = [0xff5a5a, 0xff9f1c, 0xffd23f, 0x5bd16b, 0x3fa7ff, 0x9b6bff];
