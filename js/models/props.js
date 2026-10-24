// The prop catalogue. Every prop is a group whose origin is the middle of its bottom (so it stands
// on whatever it is put on) with one child, the model. `grip` is the point a hand holds it by;
// Person.hold() shifts the model so the grip sits in the hand. Sizes are for kid hands.
import * as THREE from 'three';
import { mat, part, group, box, sphere, capsule, cyl, canvasTex, RAINBOW } from '../toon.js';

const BLACK = 0x2b2b33;

/* ======== the toys ======== */

function truck() {
  const g = group();
  g.add(part(box(0.3, 0.05, 0.16, 0.015), 0x7a7a88, 0, 0.065, 0));          // chassis
  g.add(part(box(0.11, 0.11, 0.15, 0.025), 0xe8433f, 0.09, 0.14, 0));       // cab
  g.add(part(box(0.02, 0.06, 0.12, 0.008), 0xbfe8ff, 0.146, 0.155, 0));     // windscreen
  const bed = part(box(0.17, 0.08, 0.16, 0.015), 0xffd23f, -0.06, 0.13, 0);
  bed.rotation.z = 0.12;
  g.add(bed);
  for (const x of [0.09, -0.09]) for (const z of [0.085, -0.085]) {
    const w = part(cyl(0.04, 0.04, 0.03, 16), BLACK, x, 0.04, z);
    w.rotation.x = Math.PI / 2;
    g.add(w, part(cyl(0.016, 0.016, 0.032, 10), 0xffffff, x, 0.04, z).rotateX(Math.PI / 2));
  }
  return { model: g, grip: [0, 0.2, 0] };
}

function letterBlock(letter, color) {
  const tex = canvasTex(64, 64, (c) => {
    c.fillStyle = '#fff8e8'; c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#' + new THREE.Color(color).getHexString();
    c.font = 'bold 46px Verdana'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(letter, 32, 35);
  });
  const m = part(box(0.09, 0.09, 0.09, 0.012), 0xffffff, 0, 0.045, 0);
  m.material = new THREE.MeshToonMaterial({ map: tex, gradientMap: mat(0).gradientMap });
  return m;
}

function block() {
  return { model: group(letterBlock('A', 0xe8433f)), grip: [0, 0.045, 0] };
}

function blocks() {
  const g = group();
  'ABCDE'.split('').forEach((l, i) => {
    const b = letterBlock(l, RAINBOW[i]);
    if (i < 3) { b.position.set(0, 0.045 + i * 0.092, 0); b.rotation.y = i * 0.3; }
    else { b.position.set(0.14 * (i === 3 ? 1 : -0.6), 0.045, 0.1 * (i - 3.5)); b.rotation.y = i; }
    g.add(b);
  });
  return { model: g };
}

function castle() {
  const sand = 0xe9c46a, wet = 0xd4a94e, g = group();
  g.add(part(cyl(0.15, 0.17, 0.1, 18), sand, 0, 0.05, 0));
  g.add(part(cyl(0.11, 0.12, 0.08, 16), wet, 0, 0.14, 0));
  g.add(part(cyl(0.07, 0.08, 0.07, 14), sand, 0, 0.215, 0));
  const flag = group(part(cyl(0.004, 0.004, 0.12, 5), 0x8a5a33, 0, 0.06, 0));
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, -0.02), new THREE.Vector2(0, -0.04)])), mat(0xe8433f, { side: THREE.DoubleSide }));
  cloth.position.set(0.004, 0.12, 0);
  flag.add(cloth);
  flag.position.y = 0.25;
  g.add(flag);
  return { model: g };
}

function teddy() {
  const fur = 0xb07a45, light = 0xe8c49a, g = group();
  const body = part(sphere(0.085, 16, 12), fur, 0, 0.1, 0);
  body.scale.set(1, 1.1, 0.9);
  g.add(body);
  const belly = part(sphere(0.05, 12, 8), light, 0, 0.095, 0.055);
  belly.scale.set(1, 1.15, 0.5);
  g.add(belly);
  g.add(part(sphere(0.07, 16, 12), fur, 0, 0.23, 0));
  for (const s of [1, -1]) {
    g.add(part(sphere(0.028, 10, 8), fur, s * 0.055, 0.29, -0.005));
    g.add(part(sphere(0.015, 8, 6), light, s * 0.055, 0.29, 0.01));
    g.add(part(sphere(0.01, 8, 6), BLACK, s * 0.026, 0.245, 0.062));
    const arm = part(capsule(0.025, 0.06), fur, s * 0.085, 0.13, 0.01);
    arm.rotation.z = s * 0.7;
    g.add(arm);
    const leg = part(capsule(0.03, 0.04), fur, s * 0.05, 0.03, 0.03);
    leg.rotation.x = Math.PI / 2;
    g.add(leg);
  }
  const muzzle = part(sphere(0.03, 12, 8), light, 0, 0.215, 0.058);
  muzzle.scale.z = 0.7;
  g.add(muzzle, part(sphere(0.012, 8, 6), BLACK, 0, 0.225, 0.08));
  g.add(part(new THREE.TorusGeometry(0.035, 0.008, 6, 16), 0xe8433f, 0, 0.175, 0.01).rotateX(Math.PI / 2 - 0.2));
  return { model: g, grip: [0, 0.16, 0] };
}

function ball() {
  const r = 0.11, g = group();
  for (let i = 0; i < 6; i++) {
    g.add(part(new THREE.SphereGeometry(r, 8, 16, (i * Math.PI) / 3, Math.PI / 3), i % 2 ? 0xffffff : RAINBOW[i], 0, r, 0));
  }
  g.add(part(sphere(0.02, 8, 6), 0xffffff, 0, r * 2 - 0.005, 0));
  return { model: g, grip: [0, r, 0] };
}

function dino() {
  const green = 0x5bc36b, belly = 0xd8f08a, g = group();
  const body = part(capsule(0.06, 0.1, 10), green, 0, 0.11, 0);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const neck = part(capsule(0.035, 0.08), green, 0, 0.19, 0.08);
  neck.rotation.x = 0.5;
  g.add(neck);
  const head = part(box(0.08, 0.06, 0.1, 0.025), green, 0, 0.24, 0.13);
  g.add(head);
  for (const s of [1, -1]) {
    g.add(part(sphere(0.009, 8, 6), BLACK, s * 0.03, 0.255, 0.165));
    g.add(part(capsule(0.025, 0.05), green, s * 0.045, 0.04, 0.04), part(capsule(0.025, 0.05), green, s * 0.045, 0.04, -0.05));
  }
  const tail = part(new THREE.ConeGeometry(0.045, 0.18, 10), green, 0, 0.1, -0.17);
  tail.rotation.x = -Math.PI / 2 - 0.25;
  g.add(tail);
  for (let i = 0; i < 5; i++) {
    const sp = part(new THREE.ConeGeometry(0.018, 0.04, 4), 0xff9f1c, 0, 0.17 - Math.abs(i - 1.5) * 0.008, 0.06 - i * 0.045);
    g.add(sp);
  }
  const b = part(sphere(0.05, 12, 8), belly, 0, 0.09, 0.03);
  b.scale.set(0.9, 0.8, 1.2);
  g.add(b);
  return { model: g, grip: [0, 0.16, 0] };
}

function crayons() {
  const g = group();
  g.add(part(box(0.16, 0.08, 0.05, 0.008), 0xffd23f, 0, 0.04, 0));
  RAINBOW.forEach((c, i) => {
    const x = -0.065 + i * 0.026;
    g.add(part(cyl(0.01, 0.01, 0.06, 8), c, x, 0.1, 0));
    g.add(part(new THREE.ConeGeometry(0.01, 0.02, 8), c, x, 0.14, 0));
  });
  return { model: g, grip: [0, 0.06, 0] };
}

function drawing() {
  const tex = canvasTex(256, 180, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.lineWidth = 6; c.lineCap = 'round';
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(205, 45, 26, 0, 7); c.fill();
    c.fillStyle = '#e8433f'; c.fillRect(60, 85, 90, 70);
    c.fillStyle = '#3c5fa8'; c.beginPath(); c.moveTo(48, 88); c.lineTo(105, 35); c.lineTo(162, 88); c.fill();
    c.strokeStyle = '#5bd16b'; c.beginPath(); c.moveTo(0, 160); c.lineTo(w, 160); c.stroke();
    c.fillStyle = '#ffd23f'; c.fillRect(95, 115, 22, 40);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.21), new THREE.MeshToonMaterial({ map: tex, gradientMap: mat(0).gradientMap }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  m.receiveShadow = true;
  return { model: group(m), grip: [0, 0, 0.1] };
}

function book() {
  const tex = canvasTex(128, 160, (c, w, h) => {
    c.fillStyle = '#3fa7ff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(64, 70, 34, 0, 7); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(20, 120, 88, 14);
  });
  const g = group();
  const cover = new THREE.MeshToonMaterial({ map: tex, gradientMap: mat(0).gradientMap });
  const blue = mat(0x3fa7ff), pages = mat(0xfff8e8);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.2), [pages, blue, cover, blue, pages, pages]);
  b.position.y = 0.0175;
  b.castShadow = b.receiveShadow = true;
  g.add(b);
  return { model: g, grip: [0, 0.0175, 0] };
}

function bucket() {
  const g = group();
  g.add(part(cyl(0.085, 0.065, 0.13, 18), 0x3fa7ff, 0, 0.065, 0));
  g.add(part(cyl(0.075, 0.075, 0.01, 18), 0xf2d38a, 0, 0.12, 0));
  const handle = part(new THREE.TorusGeometry(0.08, 0.006, 6, 20, Math.PI), 0xffd23f, 0, 0.13, 0);
  g.add(handle);
  return { model: g, grip: [0, 0.21, 0] };
}

function spade() {
  const g = group();
  g.add(part(cyl(0.012, 0.012, 0.2, 8), 0xffd23f, 0, 0.16, 0));
  g.add(part(box(0.08, 0.1, 0.012, 0.01), 0xe8433f, 0, 0.05, 0));
  g.add(part(box(0.07, 0.02, 0.025, 0.01), 0xffd23f, 0, 0.27, 0));
  return { model: g, grip: [0, 0.22, 0] };
}

function apple() {
  const g = group();
  const a = part(sphere(0.045, 14, 10), 0xe8433f, 0, 0.045, 0);
  a.scale.y = 0.9;
  g.add(a, part(cyl(0.004, 0.004, 0.03, 6), 0x6b4a2b, 0, 0.095, 0));
  const leaf = part(sphere(0.015, 8, 6), 0x5bd16b, 0.015, 0.1, 0);
  leaf.scale.set(1.4, 0.3, 0.7);
  g.add(leaf);
  return { model: g, grip: [0, 0.045, 0] };
}

function cup() {
  const g = group();
  g.add(part(cyl(0.035, 0.028, 0.09, 14), 0x9b6bff, 0, 0.045, 0));
  g.add(part(cyl(0.031, 0.031, 0.005, 14), 0xffa94d, 0, 0.085, 0));
  return { model: g, grip: [0, 0.05, 0] };
}

function car() {
  const g = group();
  g.add(part(box(0.18, 0.05, 0.1, 0.02), 0x3fa7ff, 0, 0.045, 0));
  g.add(part(box(0.09, 0.045, 0.085, 0.02), 0xbfe8ff, -0.01, 0.085, 0));
  for (const x of [0.055, -0.055]) for (const z of [0.05, -0.05]) {
    g.add(part(cyl(0.022, 0.022, 0.02, 12), BLACK, x, 0.022, z).rotateX(Math.PI / 2));
  }
  return { model: g, grip: [0, 0.1, 0] };
}

/* ======== catalogue ======== */

// icon: an emoji used by the viewer and the story checker's listing. hold: a kid can carry it.
export const PROPS = {
  truck:   { name: 'Red truck',     icon: '🚚', hold: true,  make: truck },
  car:     { name: 'Toy car',       icon: '🚗', hold: true,  make: car },
  block:   { name: 'Letter block',  icon: '🧱', hold: true,  make: block },
  blocks:  { name: 'Block tower',   icon: '🧱', hold: false, make: blocks },
  castle:  { name: 'Sandcastle',    icon: '🏰', hold: false, make: castle },
  teddy:   { name: 'Teddy bear',    icon: '🧸', hold: true,  make: teddy },
  ball:    { name: 'Beach ball',    icon: '⚽', hold: true,  make: ball },
  dino:    { name: 'Toy dinosaur',  icon: '🦕', hold: true,  make: dino },
  crayons: { name: 'Crayons',       icon: '🖍️', hold: true,  make: crayons },
  drawing: { name: 'Drawing',       icon: '🖼️', hold: true,  make: drawing },
  book:    { name: 'Picture book',  icon: '📘', hold: true,  make: book },
  bucket:  { name: 'Sand bucket',   icon: '🪣', hold: true,  make: bucket },
  spade:   { name: 'Spade',         icon: '🥄', hold: true,  make: spade },
  apple:   { name: 'Apple',         icon: '🍎', hold: true,  make: apple },
  cup:     { name: 'Juice cup',     icon: '🥤', hold: true,  make: cup },
};

export function makeProp(id) {
  const def = PROPS[id];
  const { model, grip } = def.make();
  const obj = new THREE.Group();
  obj.name = id;
  obj.add(model);
  obj.userData.prop = id;
  if (grip) obj.userData.grip = new THREE.Vector3(...grip);
  return obj;
}
