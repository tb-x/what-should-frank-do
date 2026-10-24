// The sets. Each make function returns { object, marks, sky, cam }:
//  marks: named spots { pos, yaw } that stories walk people to (yaw 0 faces +z, the camera side);
//  sky: the background colour; cam: a default wide camera { pos, look }; bounds: where a camera may go;
//  ground(x, z), optional: how high the floor is there (the sandbox's sand), 0 elsewhere.
// The classroom is a three-wall box open towards +z, like a doll's house, so the camera can look in.
import * as THREE from 'three';
import { mat, part, group, box, sphere, cyl, canvasTex, picture, RAINBOW } from '../toon.js';
import { makeProp } from './props.js';

const WOOD = 0xd9a86c, WOOD_DARK = 0xb98450, WHITE = 0xfffaf0;
const PI = Math.PI;

function mark(pos, yaw = 0) {
  return { pos: new THREE.Vector3(...pos), yaw };
}

function put(parent, obj, x, y, z, yaw = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = yaw;
  parent.add(obj);
  return obj;
}

/* ======== furniture ======== */

function kidChair(color) {
  const g = group();
  g.add(part(box(0.32, 0.04, 0.3, 0.015), color, 0, 0.22, 0));
  for (const x of [0.13, -0.13]) for (const z of [0.12, -0.12]) g.add(part(cyl(0.017, 0.017, 0.22, 8), color, x, 0.11, z));
  g.add(part(box(0.32, 0.18, 0.03, 0.015), color, 0, 0.38, -0.14));
  return g;
}

function kidTable(w, d, color) {
  const g = group();
  g.add(part(box(w, 0.05, d, 0.02), color, 0, 0.5, 0));
  for (const x of [w / 2 - 0.08, -w / 2 + 0.08]) for (const z of [d / 2 - 0.08, -d / 2 + 0.08]) {
    g.add(part(cyl(0.03, 0.03, 0.48, 10), 0xfafafa, x, 0.24, z));
  }
  return g;
}

function grownupChair() {
  const g = group();
  g.add(part(box(0.5, 0.06, 0.48, 0.02), 0x6a8fd8, 0, 0.45, 0));
  for (const x of [0.2, -0.2]) for (const z of [0.19, -0.19]) g.add(part(cyl(0.025, 0.025, 0.45, 8), WOOD_DARK, x, 0.225, z));
  g.add(part(box(0.5, 0.5, 0.05, 0.02), 0x6a8fd8, 0, 0.75, -0.22));
  return g;
}

function toyShelf() {
  const g = group(), w = 1.8, h = 0.8, d = 0.4;
  for (const x of [-w / 2, w / 2]) g.add(part(box(0.04, h, d, 0.01), WOOD, x, h / 2, 0));
  for (const y of [0.03, h / 2, h]) g.add(part(box(w, 0.04, d, 0.01), WOOD, 0, y, 0));
  g.add(part(box(w, h, 0.02, 0.005), WOOD_DARK, 0, h / 2, -d / 2));
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
    const bin = part(box(0.38, 0.3, 0.33, 0.03), RAINBOW[(i + row * 2) % RAINBOW.length], -w / 2 + 0.25 + i * 0.43, 0.2 + row * h / 2, 0.02);
    g.add(bin);
  }
  return g;
}

function bookshelf() {
  const g = group(), w = 1.3, h = 0.9;
  for (const x of [-w / 2, w / 2]) g.add(part(box(0.04, h, 0.3, 0.01), WOOD, x, h / 2, 0));
  for (const y of [0.03, 0.46, h]) g.add(part(box(w, 0.04, 0.3, 0.01), WOOD, 0, y, 0));
  g.add(part(box(w, h, 0.02, 0.005), WOOD_DARK, 0, h / 2, -0.15));
  let n = 0;
  for (const y of [0.05, 0.48]) {
    let x = -w / 2 + 0.06;
    while (x < w / 2 - 0.1) {
      const bw = 0.04 + ((n * 7) % 3) * 0.015, bh = 0.26 + ((n * 5) % 4) * 0.03;
      const b = part(box(bw, bh, 0.22, 0.006), RAINBOW[n % 6], x + bw / 2, y + bh / 2, 0.02);
      if (n % 9 === 4) b.rotation.z = -0.25;
      g.add(b);
      x += bw + 0.008;
      n++;
    }
  }
  return g;
}

function beanBag(color) {
  const b = part(sphere(0.38, 20, 14), color, 0, 0.2, 0);
  b.scale.set(1, 0.55, 1);
  return group(b);
}

function easel() {
  const g = group();
  for (const s of [1, -1]) {
    const leg = part(cyl(0.02, 0.02, 1.3, 8), WOOD_DARK, s * 0.32, 0.62, 0.05);
    leg.rotation.x = -0.12;
    g.add(leg);
  }
  const back = part(cyl(0.02, 0.02, 1.25, 8), WOOD_DARK, 0, 0.6, -0.25);
  back.rotation.x = 0.3;
  g.add(back);
  g.add(part(box(0.8, 0.04, 0.08, 0.01), WOOD, 0, 0.55, 0.12));
  const art = picture(0.7, 0.55, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9ad9ff'; c.fillRect(0, 0, w, h * 0.65);
    c.fillStyle = '#5bd16b'; c.fillRect(0, h * 0.65, w, h);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(w * 0.78, h * 0.25, 26, 0, 7); c.fill();
    c.fillStyle = '#ff5a8a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(30 + i * 45, h * 0.8, 10, 0, 7); c.fill(); }
  });
  art.position.set(0, 0.88, 0.1);
  art.rotation.x = -0.12;
  g.add(art);
  return g;
}

function cubbies(n) {
  const g = group(), cw = 0.4, h = 1.25, d = 0.38;
  const backpacks = [0xe8433f, 0x3fa7ff, 0x5bd16b, 0xff9f1c, 0x9b6bff];
  for (let i = 0; i <= n; i++) g.add(part(box(0.03, h, d, 0.01), WOOD, -n * cw / 2 + i * cw, h / 2, 0));
  for (const y of [0.03, 0.35, h]) g.add(part(box(n * cw, 0.03, d, 0.01), WOOD, 0, y, 0));
  g.add(part(box(n * cw, h, 0.02, 0.005), 0xf3e6c8, 0, h / 2, -d / 2));
  for (let i = 0; i < n; i++) {
    const x = -n * cw / 2 + cw / 2 + i * cw;
    g.add(part(sphere(0.022, 8, 6), 0xffd23f, x, 1.05, -0.15));
    if (i % 2 === 0 || i === n - 1) {
      const bp = part(box(0.24, 0.3, 0.13, 0.05), backpacks[i % 5], x, 0.82, -0.08);
      g.add(bp, part(box(0.2, 0.1, 0.03, 0.02), backpacks[(i + 2) % 5], x, 0.74, 0.0));
    }
    const shoe = part(box(0.1, 0.06, 0.17, 0.03), RAINBOW[(i + 3) % 6], x - 0.06, 0.08, 0.02);
    g.add(shoe, part(box(0.1, 0.06, 0.17, 0.03), RAINBOW[(i + 3) % 6], x + 0.06, 0.08, 0.02));
  }
  return g;
}

function plant() {
  const g = group();
  g.add(part(cyl(0.18, 0.13, 0.3, 14), 0xd86f45, 0, 0.15, 0));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, leaf = part(sphere(0.16, 10, 8), 0x3e9e52, Math.cos(a) * 0.12, 0.42 + (i % 3) * 0.12, Math.sin(a) * 0.12);
    leaf.scale.set(1, 1.3, 0.7);
    leaf.rotation.y = a;
    g.add(leaf);
  }
  return g;
}

function windowPane(w, h) {
  const g = group();
  const sky = picture(w, h, (c, cw, ch) => {
    const grd = c.createLinearGradient(0, 0, 0, ch);
    grd.addColorStop(0, '#7cc8ff'); grd.addColorStop(1, '#d6f0ff');
    c.fillStyle = grd; c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[60, 50, 22], [85, 45, 28], [110, 55, 20], [190, 90, 18], [210, 85, 24]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = '#7fcf6a'; c.fillRect(0, ch * 0.82, cw, ch);
  });
  sky.material = new THREE.MeshBasicMaterial({ map: sky.material.map });
  g.add(sky);
  const t = 0.06;
  for (const [x, y, fw, fh] of [[0, h / 2, w + t, t], [0, -h / 2, w + t, t], [w / 2, 0, t, h], [-w / 2, 0, t, h], [0, 0, t * 0.6, h], [0, 0, w, t * 0.6]]) {
    g.add(part(box(fw, fh, 0.08, 0.01), WHITE, x, y, 0.02));
  }
  g.add(part(box(w + 0.2, 0.06, 0.2, 0.02), WHITE, 0, -h / 2 - 0.04, 0.08));
  for (const s of [1, -1]) {
    const cur = part(box(0.28, h + 0.25, 0.06, 0.03), 0xff9f1c, s * (w / 2 + 0.12), 0.05, 0.1);
    g.add(cur);
  }
  g.add(part(box(w + 0.6, 0.14, 0.1, 0.04), 0xff9f1c, 0, h / 2 + 0.16, 0.1));
  return g;
}

function bunting(x0, x1, y, sag, wallZ, alongX = true) {
  const g = group(), n = Math.round(Math.abs(x1 - x0) / 0.38);
  const line = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x0, y, 0), new THREE.Vector3((x0 + x1) / 2, y - sag, 0), new THREE.Vector3(x1, y, 0),
  ]);
  g.add(part(new THREE.TubeGeometry(line, 40, 0.006, 4), 0x8a6a4a));
  const tri = new THREE.Shape([new THREE.Vector2(-0.12, 0), new THREE.Vector2(0.12, 0), new THREE.Vector2(0, -0.22)]);
  const geo = new THREE.ShapeGeometry(tri);
  for (let i = 0; i < n; i++) {
    const p = line.getPoint((i + 0.5) / n);
    const f = new THREE.Mesh(geo, mat(RAINBOW[i % 6], { side: THREE.DoubleSide }));
    f.position.copy(p);
    f.castShadow = true;
    g.add(f);
  }
  g.position.z = wallZ;
  return g;
}

function wallClock() {
  const face = picture(0.36, 0.36, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#2a2140'; c.font = 'bold 26px Verdana'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * 2 * PI; c.fillText(i, w / 2 + Math.sin(a) * 98, h / 2 - Math.cos(a) * 98); }
    c.strokeStyle = '#2a2140'; c.lineCap = 'round';
    c.lineWidth = 9; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h / 2 - 60); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 75, h / 2); c.stroke();
  });
  face.material.transparent = true;
  face.material.alphaTest = 0.5;
  const rim = part(new THREE.TorusGeometry(0.18, 0.025, 8, 32), 0xe8433f);
  return group(face, rim);
}

/* ======== the classroom ======== */

export function makeClassroom() {
  const room = group();
  const W = 9, D = 7, H = 2.7, hx = W / 2, hz = D / 2;

  // floor: wooden planks
  const planks = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e6bf86'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#dcb178' : '#e9c48e';
      c.fillRect(0, i * 32, w, 31);
      c.fillStyle = '#c99a62';
      c.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
  }, [W / 2, D / 2]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshToonMaterial({ map: planks, gradientMap: mat(0).gradientMap }));
  floor.rotation.x = -PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // three walls: mint below the rail, cream above
  const wall = (len, x, z, yaw) => {
    const g = group(
      part(box(len, 0.9, 0.16, 0.01), 0x9fdcc4, 0, 0.45, 0),
      part(box(len, H - 0.9, 0.15, 0.01), 0xfff1d6, 0, 0.9 + (H - 0.9) / 2, 0),
      part(box(len, 0.06, 0.22, 0.02), WHITE, 0, 0.9, 0),
      part(box(len, 0.1, 0.2, 0.02), WHITE, 0, 0.05, 0),
    );
    return put(room, g, x, 0, z, yaw);
  };
  wall(W + 0.3, 0, -hz - 0.08, 0);
  wall(D, -hx - 0.08, 0, PI / 2);
  wall(D, hx + 0.08, 0, -PI / 2);

  // back wall: windows, clock, bunting
  for (const x of [-2, 2]) put(room, windowPane(1.5, 1.05), x, 1.6, -hz + 0.02);
  put(room, wallClock(), 0, 2.05, -hz + 0.03);
  room.add(bunting(-hx + 0.2, hx - 0.2, 2.55, 0.25, -hz + 0.1));

  // left wall: alphabet frieze and two pictures above the toy shelf
  const abc = picture(5.2, 0.32, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.font = 'bold 40px Verdana'; c.textBaseline = 'middle';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l, i) => {
      c.fillStyle = ['#e8433f', '#ff9f1c', '#e0b000', '#3fae4f', '#2f8fe8', '#8a5bf0'][i % 6];
      c.fillText(l, 12 + i * (w - 24) / 26, h / 2);
    });
  }, 1024);
  put(room, abc, -hx + 0.01, 2.2, 0, PI / 2);
  put(room, picture(0.6, 0.45, (c, w, h) => {
    c.fillStyle = '#fff8e8'; c.fillRect(0, 0, w, h);
    RAINBOW.forEach((col, i) => {
      c.strokeStyle = '#' + new THREE.Color(col).getHexString(); c.lineWidth = 12;
      c.beginPath(); c.arc(w / 2, h, w * 0.42 - i * 13, PI, 0); c.stroke();
    });
  }), -hx + 0.01, 1.45, -0.3, PI / 2);
  put(room, picture(0.5, 0.45, (c, w, h) => {
    c.fillStyle = '#fff8e8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffb703'; c.beginPath(); c.arc(w / 2, h / 2, 50, 0, 7); c.fill();
    c.strokeStyle = '#ffb703'; c.lineWidth = 10;
    for (let i = 0; i < 10; i++) { const a = i * PI / 5; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 65, h / 2 + Math.sin(a) * 65); c.lineTo(w / 2 + Math.cos(a) * 95, h / 2 + Math.sin(a) * 95); c.stroke(); }
  }), -hx + 0.01, 1.45, 0.75, PI / 2);

  // right wall: door and cubbies
  const door = group(
    part(box(1.05, 2.15, 0.1, 0.02), WHITE, 0, 1.075, 0),
    part(box(0.9, 2.05, 0.1, 0.02), 0x5aa0e0, 0, 1.03, 0.03),
    part(sphere(0.045, 10, 8), 0xffd23f, 0.33, 1.0, 0.1),
  );
  const porthole = part(cyl(0.18, 0.18, 0.11, 20), 0xbfe8ff, 0, 1.55, 0.04);
  porthole.rotation.x = PI / 2;
  door.add(porthole);
  put(room, door, hx - 0.01, 0, 2.3, -PI / 2);
  put(room, cubbies(4), hx - 0.2, 0, 0.7, -PI / 2);

  // the rug: rainbow rings
  const rug = group();
  [0x3fa7ff, 0x5bd16b, 0xffd23f, 0xff9f1c, 0xff5a5a].forEach((c, i) => {
    rug.add(part(cyl(1.5 - i * 0.28, 1.5 - i * 0.28, 0.012 + i * 0.002, 40), c, 0, 0.006 + i * 0.001, 0));
  });
  rug.children.forEach((m) => (m.castShadow = false));
  put(room, rug, 0, 0, 0.4);

  // teacher's story chair behind the rug
  put(room, grownupChair(), 0, 0, -1.5);

  // toy shelf on the left wall, with toys on top
  const shelf = put(room, toyShelf(), -hx + 0.25, 0, 0.3, PI / 2);
  put(shelf, makeProp('teddy'), -0.55, 0.82, 0, 0.3);
  put(shelf, makeProp('dino'), 0.55, 0.82, 0, -0.8);
  put(shelf, makeProp('blocks'), 0.05, 0.82, 0);

  // reading corner: bookshelf and bean bags
  put(room, bookshelf(), -2.9, 0, -hz + 0.2);
  put(room, beanBag(0x9b6bff), -3.7, 0, -2.5);
  put(room, beanBag(0xff5a8a), -2.6, 0, -2.4);
  const corner = part(cyl(1.0, 1.0, 0.01, 32), 0xcdb8f5, -3.2, 0.005, -2.6);
  corner.castShadow = false;
  room.add(corner);

  // two low tables with chairs
  const chairCols = [0xe8433f, 0x3fa7ff, 0x5bd16b, 0xffd23f];
  const tables = [[2.7, -1.4], [2.7, 0.75]];
  const marks = {};
  tables.forEach(([tx, tz], ti) => {
    const t = put(room, kidTable(1.2, 0.7, ti ? 0xffd23f : 0x6fc3e8), tx, 0, tz);
    let n = 0;
    for (const side of [1, -1]) for (const dx of [-0.3, 0.3]) {
      const yaw = side > 0 ? PI : 0;
      put(room, kidChair(chairCols[n % 4]), tx + dx, 0, tz + side * 0.5, yaw);
      marks[`table.${ti + 1}.seat${++n}`] = mark([tx + dx, 0, tz + side * 0.42], yaw);
    }
    marks[`table.${ti + 1}`] = mark([tx - 0.85, 0, tz], PI / 2);
    marks[`table.${ti + 1}.top`] = mark([tx, 0.525, tz]);
    // where a cup or plate goes in front of each seat
    [[-0.3, 1], [0.3, 1], [-0.3, -1], [0.3, -1]].forEach(([dx, side], k) => {
      marks[`table.${ti + 1}.place${k + 1}`] = mark([tx + dx, 0.525, tz + side * 0.2], side > 0 ? PI : 0);
    });
    if (ti === 0) {
      put(room, makeProp('crayons'), tx - 0.15, 0.525, tz + 0.1, 0.2);
      put(room, makeProp('drawing'), tx + 0.3, 0.525, tz - 0.1, -0.3);
    }
  });

  // easel and plants
  put(room, easel(), 1.5, 0, -2.9, -0.15);
  put(room, plant(), hx - 0.4, 0, -hz + 0.4);
  put(room, plant(), -hx + 0.4, 0, hz - 0.5);

  Object.assign(marks, {
    door: mark([3.9, 0, 2.3], -PI / 2),
    'rug.a': mark([-0.6, 0, 0.55], PI / 2),
    'rug.b': mark([0.6, 0, 0.55], -PI / 2),
    'rug.c': mark([0, 0, -0.25], 0),
    'rug.frontA': mark([-0.15, 0, 0.55]),
    'rug.frontB': mark([0.15, 0, 1.15]),
    'rug.middle': mark([0, 0, 0.55]),
    teacherChair: mark([0, 0, -1.42], 0),
    shelf: mark([-3.55, 0, 0.3], -PI / 2),
    'shelf.top': mark([-4.25, 0.82, 0.15], 0),
    reading: mark([-3.15, 0, -1.9], 0),
    easel: mark([1.45, 0, -2.25], PI),
    cubbies: mark([3.6, 0, 0.7], PI / 2),
    window: mark([-2, 0, -2.9], PI),
    front: mark([0, 0, 2.4], 0),
  });

  return { object: room, marks, sky: 0xbfe6ff, cam: { pos: [0, 3.0, 7.6], look: [0, 0.7, -0.2] }, bounds: { minX: -4.2, maxX: 4.2, minZ: -3.2, maxZ: 10, maxY: 2.5 } };
}

/* ======== the playground ======== */

function tree(h = 1) {
  const g = group();
  g.add(part(cyl(0.12 * h, 0.18 * h, 1.4 * h, 10), 0x8a5a33, 0, 0.7 * h, 0));
  for (const [x, y, z, r] of [[0, 1.9, 0, 0.75], [0.45, 1.6, 0.2, 0.5], [-0.45, 1.65, -0.1, 0.55], [0.1, 2.3, -0.2, 0.5]]) {
    g.add(part(sphere(r * h, 14, 10), 0x4cae55, x * h, y * h, z * h));
  }
  return g;
}

function slide() {
  const g = group(), top = 1.05;
  for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) g.add(part(cyl(0.04, 0.04, top + 0.6, 10), 0x3fa7ff, x, (top + 0.6) / 2, z));
  g.add(part(box(0.7, 0.06, 0.7, 0.02), 0xffd23f, 0, top, 0));
  for (const x of [-0.3, 0.3]) g.add(part(box(0.04, 0.04, 0.66, 0.01), 0x3fa7ff, x, top + 0.45, 0));
  // ladder at the back
  for (const x of [-0.2, 0.2]) {
    const rail = part(cyl(0.025, 0.025, 1.25, 8), 0xe8433f, x, top / 2, -0.62);
    rail.rotation.x = -0.35;
    g.add(rail);
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.2 + i * 0.24, z = -0.78 + i * 0.09;
    g.add(part(cyl(0.02, 0.02, 0.4, 8), 0xffffff, 0, y, z).rotateZ(PI / 2));
  }
  // the chute
  const len = 1.9, ang = 0.6;
  const chute = group(part(box(0.55, 0.04, len, 0.015), 0xff5a5a, 0, 0, 0));
  for (const s of [1, -1]) chute.add(part(box(0.04, 0.12, len, 0.015), 0xff9f1c, s * 0.28, 0.05, 0));
  chute.position.set(0, top / 2 + 0.03, 0.35 + Math.cos(ang) * len / 2);
  chute.rotation.x = ang;
  g.add(chute);
  return g;
}

function swings() {
  const g = group(), h = 1.9;
  for (const x of [-1.1, 1.1]) for (const s of [1, -1]) {
    const leg = part(cyl(0.05, 0.05, h + 0.1, 10), 0x5bd16b, x, h / 2, s * 0.45);
    leg.rotation.x = s * 0.24;
    g.add(leg);
  }
  g.add(part(cyl(0.05, 0.05, 2.3, 10), 0x3c8a4a, 0, h, 0).rotateZ(PI / 2));
  for (const x of [-0.5, 0.5]) {
    for (const dx of [-0.17, 0.17]) g.add(part(cyl(0.01, 0.01, 1.45, 6), 0x9a9aa8, x + dx, h - 0.725, 0));
    g.add(part(box(0.42, 0.04, 0.2, 0.015), x < 0 ? 0xe8433f : 0x3fa7ff, x, h - 1.45, 0));
  }
  return g;
}

function sandbox() {
  const g = group(), s = 1.7;
  for (const [x, z, w, d] of [[0, s / 2, s, 0.12], [0, -s / 2, s, 0.12], [s / 2, 0, 0.12, s], [-s / 2, 0, 0.12, s]]) {
    g.add(part(box(w, 0.22, d, 0.03), WOOD, x, 0.11, z));
  }
  g.add(part(box(s - 0.1, 0.12, s - 0.1, 0.03), 0xf2d38a, 0, 0.06, 0));
  const mound = part(sphere(0.3, 14, 8), 0xf2d38a, 0.3, 0.1, -0.3);
  mound.scale.y = 0.4;
  g.add(mound);
  return g;
}

function bench() {
  const g = group();
  for (const x of [-0.6, 0.6]) g.add(part(box(0.08, 0.4, 0.4, 0.02), 0x6a6a78, x, 0.2, 0));
  for (const z of [-0.12, 0, 0.12]) g.add(part(box(1.5, 0.04, 0.1, 0.015), WOOD, 0, 0.42, z));
  for (const y of [0.6, 0.75]) g.add(part(box(1.5, 0.1, 0.03, 0.015), WOOD, 0, y, -0.2));
  return g;
}

export function makePlayground() {
  const yard = group();
  const grass = part(new THREE.CircleGeometry(12, 48), 0x8fd16a);
  grass.rotation.x = -PI / 2;
  grass.castShadow = false;
  yard.add(grass);
  const path = part(new THREE.PlaneGeometry(1.4, 7), 0xe9d6a8, 0, 0.004, 3.5);
  path.rotation.x = -PI / 2;
  path.castShadow = false;
  yard.add(path);

  // fence round the back
  for (let i = -14; i <= 14; i++) {
    const a = (i / 14) * 1.25, x = Math.sin(a) * 7.5, z = -Math.cos(a) * 7.5;
    put(yard, group(part(box(0.1, 0.9, 0.06, 0.02), WHITE, 0, 0.45, 0), part(new THREE.ConeGeometry(0.07, 0.12, 4), WHITE, 0, 0.95, 0)), x, 0, z, -a);
  }
  for (const y of [0.3, 0.7]) {
    const curve = new THREE.EllipseCurve(0, 0, 7.5, 7.5, -PI / 2 - 1.25, -PI / 2 + 1.25);
    const pts = curve.getPoints(40).map((p) => new THREE.Vector3(p.x, y, p.y));
    yard.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 5), WHITE));
  }

  const SLIDE = { x: -2.6, z: -1.8, yaw: 0.25 };
  put(yard, slide(), SLIDE.x, 0, SLIDE.z, SLIDE.yaw);
  // a point in the slide's own frame (its chute runs towards +z) as a mark, facing down the slide
  const onSlide = (x, y, z) => mark([
    SLIDE.x + x * Math.cos(SLIDE.yaw) + z * Math.sin(SLIDE.yaw), y,
    SLIDE.z - x * Math.sin(SLIDE.yaw) + z * Math.cos(SLIDE.yaw)], SLIDE.yaw);
  put(yard, swings(), 2.6, 0, -2.4, -0.2);
  put(yard, sandbox(), 0.2, 0, 0.6);
  put(yard, makeProp('bucket'), -0.1, 0.12, 0.5);
  put(yard, makeProp('spade'), 0.45, 0.12, 0.8, 1.2).rotation.z = PI / 2.2;
  put(yard, makeProp('ball'), -1.9, 0, 1.6);
  put(yard, bench(), 3.6, 0, 1.5, -PI / 2);
  put(yard, tree(1.2), -5, 0, -3.8);
  put(yard, tree(1.0), 5.2, 0, -2.6);
  put(yard, tree(0.9), -5.6, 0, 1.4);
  for (const [x, z, c] of [[-3.8, 2.6, 0xff5a8a], [-3.4, 2.9, 0xffd23f], [4.4, -4.6, 0xff9f1c]]) {
    put(yard, group(part(cyl(0.01, 0.01, 0.2, 5), 0x3e9e52, 0, 0.1, 0), part(sphere(0.05, 8, 6), c, 0, 0.21, 0)), x, 0, z);
  }

  const marks = {
    gate: mark([0, 0, 4.5], PI),
    'slide.queue2': onSlide(0, 0, -2.05),
    'slide.queue1': onSlide(0, 0, -1.45),
    'slide.ladder': onSlide(0, 0, -0.95),
    'slide.top': onSlide(0, 1.08, -0.05),
    'slide.chuteTop': onSlide(0, 1.08, 0.38),
    'slide.chuteEnd': onSlide(0, 0.05, 1.92),
    'slide.bottom': onSlide(0, 0, 2.4),
    'slide.side': onSlide(0.9, 0, 1.2),
    'swing.1': mark([2.1, 0, -1.6], PI),
    'swing.2': mark([3.1, 0, -1.8], PI),
    'sandbox.a': mark([-0.5, 0, 0.6], PI / 2),
    'sandbox.b': mark([0.9, 0, 0.6], -PI / 2),
    'sandbox.castle': mark([0.2, 0.12, 0.6], 0),
    bench: mark([3.6, 0, 1.5], -PI / 2),
    middle: mark([0, 0, 2.6], 0),
    'race.startA': mark([-3.0, 0, 2.55], PI / 2),
    'race.startB': mark([-3.0, 0, 3.25], PI / 2),
    'race.finishA': mark([2.3, 0, 2.55], PI / 2),
    'race.finishB': mark([2.3, 0, 3.25], PI / 2),
    'race.starter': mark([-2.3, 0, 1.9], -PI / 4),
  };
  // the sand in the sandbox is higher than the grass
  const ground = (x, z) => (Math.abs(x - 0.2) < 0.79 && Math.abs(z - 0.6) < 0.79 ? 0.12 : 0);
  return { object: yard, marks, ground, sky: 0x9ad9ff, cam: { pos: [0, 4.2, 9.5], look: [0, 0.6, -0.5] }, bounds: { minX: -9, maxX: 9, minZ: -7, maxZ: 12, maxY: 6 } };
}

/* ======== the washroom ======== */

// Three toilet cubicles with doors along the back wall, three low sinks on the right wall, the way in
// on the left. The cubicle doors open with the `door` beat (place.doors, keyed like the marks).
export function makeWashroom() {
  const room = group();
  const W = 7, D = 5.5, H = 2.6, hx = W / 2, hz = D / 2;
  const tiles = (a, b, n) => canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = b; c.fillRect(0, 0, w, h);
    c.fillStyle = a;
    const s = w / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) c.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
  }, n);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshToonMaterial({ map: tiles('#dfeef7', '#ffffff', [W, D]), gradientMap: mat(0).gradientMap }));
  floor.rotation.x = -PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // walls: tiles to 1.3 m, pale yellow above
  const wall = (len, x, z, yaw) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(len, 1.3, 0.14), new THREE.MeshToonMaterial({ map: tiles('#bfe6e0', '#e8f7f4', [len / 1.2, 1.1]), gradientMap: mat(0).gradientMap }));
    t.position.y = 0.65;
    t.receiveShadow = true;
    const g = group(t, part(box(len, H - 1.3, 0.14, 0.01), 0xfff4cf, 0, 1.3 + (H - 1.3) / 2, 0), part(box(len, 0.06, 0.2, 0.02), WHITE, 0, 1.32, 0));
    return put(room, g, x, 0, z, yaw);
  };
  wall(W + 0.28, 0, -hz - 0.07, 0);
  wall(D, -hx - 0.07, 0, PI / 2);
  wall(D, hx + 0.07, 0, -PI / 2);

  // cubicles
  const doors = {}, marks = {};
  const doorCols = [0xffd23f, 0x5bd16b, 0x3fa7ff];
  const cw = 1.2, left = -3.2, front = -hz + 1.25;
  for (let i = 0; i <= 3; i++) {
    room.add(part(box(0.05, 1.35, 1.25, 0.01), 0xf3f6fa, left + i * cw, 0.8, -hz + 0.625));
  }
  for (let i = 0; i < 3; i++) {
    const cx = left + cw / 2 + i * cw, k = `cubicle.${i + 1}`;
    // the little toilet: bowl, seat, cistern with a button
    room.add(part(cyl(0.16, 0.12, 0.3, 18), 0xffffff, cx, 0.15, -hz + 0.4));
    room.add(part(new THREE.TorusGeometry(0.15, 0.03, 8, 20), doorCols[i], cx, 0.31, -hz + 0.4).rotateX(PI / 2));
    room.add(part(box(0.38, 0.34, 0.14, 0.03), 0xffffff, cx, 0.55, -hz + 0.12));
    room.add(part(cyl(0.035, 0.035, 0.02, 12), 0x8fd3ff, cx, 0.73, -hz + 0.12));
    room.add(part(cyl(0.05, 0.05, 0.1, 12), 0xffffff, cx + 0.45, 0.55, -hz + 0.6).rotateZ(PI / 2));
    // front: a narrow fixed panel and a door hung on the left
    room.add(part(box(0.18, 1.3, 0.04, 0.01), 0xf3f6fa, cx + 0.5, 0.8, front));
    const hinge = new THREE.Group();
    hinge.position.set(cx - cw / 2 + 0.05, 0, front);
    hinge.userData.open = 1.45;          // radians, swings in
    hinge.add(part(box(0.84, 1.2, 0.035, 0.015), doorCols[i], 0.42, 0.8, 0));
    hinge.add(part(sphere(0.03, 8, 6), 0xffffff, 0.74, 0.8, 0.03));
    room.add(hinge);
    doors[k] = hinge;
    marks[k] = mark([cx, 0, front + 0.55], PI);
    marks[`inside.${i + 1}`] = mark([cx, 0, -hz + 0.75], 0);
  }

  // sinks on the right wall, low for kids, with mirrors and soap
  [-1.0, 0.25, 1.5].forEach((z, i) => {
    const s = group(
      part(box(0.42, 0.14, 0.5, 0.05), 0xffffff, 0, 0.6, 0),
      part(cyl(0.16, 0.12, 0.05, 18), 0xd8eef7, 0, 0.66, 0),
      part(cyl(0.02, 0.02, 0.16, 8), 0xc0c8d0, 0, 0.74, -0.2),
      part(cyl(0.015, 0.015, 0.1, 8), 0xc0c8d0, 0, 0.8, -0.15).rotateX(PI / 2),
      part(cyl(0.035, 0.03, 0.1, 10), 0xff8fc8, 0.15, 0.73, -0.2),
      part(cyl(0.05, 0.05, 0.5, 8), 0xffffff, 0, 0.3, -0.12),
    );
    const mirror = picture(0.42, 0.42, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#e8f6ff'); g.addColorStop(1, '#a9d8f0');
      c.fillStyle = g; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 40); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 10; c.beginPath(); c.moveTo(60, 180); c.lineTo(180, 60); c.stroke();
    });
    mirror.material.transparent = true;
    mirror.material.alphaTest = 0.5;
    mirror.position.set(0, 1.12, -0.24);
    s.add(mirror);
    put(room, s, hx - 0.28, 0, z, -PI / 2);
    marks[`sink.${i + 1}`] = mark([hx - 0.78, 0, z], PI / 2);
  });
  // towels on hooks and a bin
  for (const [z, c] of [[2.35, 0xff9f1c], [2.0, 0x9b6bff]]) {
    room.add(part(box(0.3, 0.4, 0.04, 0.03), c, hx - 0.03, 1.05, z).rotateY(PI / 2));
  }
  room.add(part(cyl(0.16, 0.13, 0.4, 16), 0x5bd16b, hx - 0.3, 0.2, 2.45));

  // the way in, and a hand-washing poster
  const door = group(
    part(box(1.05, 2.15, 0.1, 0.02), WHITE, 0, 1.075, 0),
    part(box(0.9, 2.05, 0.1, 0.02), 0x5aa0e0, 0, 1.03, 0.03),
    part(sphere(0.045, 10, 8), 0xffd23f, 0.33, 1.0, 0.1),
  );
  put(room, door, -hx + 0.01, 0, 1.6, PI / 2);
  put(room, picture(0.7, 0.5, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7fd3ff';
    for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(30 + (i * 53) % 200, 30 + (i * 37) % 120, 8 + (i % 3) * 5, 0, 7); c.fill(); }
    c.fillStyle = '#f6c49f';
    c.beginPath(); c.ellipse(100, 120, 34, 22, -0.4, 0, 7); c.fill();
    c.beginPath(); c.ellipse(150, 120, 34, 22, 0.4, 0, 7); c.fill();
  }), -hx + 0.01, 1.6, -0.6, PI / 2);
  put(room, plant(), -hx + 0.4, 0, hz - 0.4);

  Object.assign(marks, {
    door: mark([-hx + 0.6, 0, 1.6], PI / 2),
    wait: mark([0.9, 0, -0.4], -2.4),
    middle: mark([0.2, 0, 0.9], 0),
    poster: mark([-hx + 0.7, 0, -0.6], -PI / 2),
  });
  return {
    object: room, marks, doors, sky: 0xd6f0ff,
    cam: { pos: [1.0, 2.7, 6.6], look: [0.6, 0.8, -0.4] },
    bounds: { minX: -3.3, maxX: 3.3, minZ: -1.2, maxZ: 9, maxY: 2.4 },
  };
}

export const PLACES = { classroom: makeClassroom, playground: makePlayground, washroom: makeWashroom };
