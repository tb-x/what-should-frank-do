// Kids and grown-ups, built from capsules and spheres in a chunky toy style. A spec (see cast.js)
// picks the look; the rig is a tree of pivot groups that ACTIONS (anim.js) pose every frame.
// The character faces +z. L is the character's left (+x), R its right (-x).
import * as THREE from 'three';
import { mat, part, sphere, capsule, cyl, box } from '../toon.js';
import { ACTIONS, restPose } from '../anim.js';
import { PaintedFace } from './paintedFace.js';

/* ======== proportions ======== */

// Lengths in metres. A kid is about 1.15 m, a grown-up about 1.7 m.
const KID = {
  thigh: 0.17, shin: 0.16, legR: 0.062, hipX: 0.072, foot: [0.13, 0.06, 0.17],
  torsoH: 0.34, torsoTop: 0.125, torsoBot: 0.15, shoulderX: 0.16, shoulderY: 0.25, neck: 0.335,
  upper: 0.14, lower: 0.13, armR: 0.045, handR: 0.052,
  headR: 0.215, headY: 0.19, skirt: 0.17, seat: 0.24,
  walk: 0.95, run: 2.0, tiptoe: 0.45,
};
const ADULT = {
  thigh: 0.37, shin: 0.35, legR: 0.072, hipX: 0.09, foot: [0.14, 0.07, 0.24],
  torsoH: 0.56, torsoTop: 0.16, torsoBot: 0.17, shoulderX: 0.2, shoulderY: 0.44, neck: 0.52,
  upper: 0.28, lower: 0.25, armR: 0.05, handR: 0.06,
  headR: 0.185, headY: 0.185, skirt: 0.36, seat: 0.45,
  walk: 1.15, run: 2.4, tiptoe: 0.55,
};
for (const P of [KID, ADULT]) P.hipY = P.thigh + P.shin + P.foot[1] * 0.65;

/* ======== faces ======== */

// Each feeling picks a mouth, the eyes, the brows' tilt (− = inner ends up, sad) and lift, how far
// the upper eyelids come down (lid, 0 to 1) and their slant (lidTilt: + = inner corners down, cross;
// − = outer corners down, sad), and where the eyes look (look: [sideways, up], −1 to 1).
export const FEELINGS = {
  neutral:     { mouth: 'smile',  eyes: 'open',   tilt: 0,     lift: 0 },
  happy:       { mouth: 'grin',   eyes: 'open',   tilt: -0.1,  lift: 0.01 },
  joy:         { mouth: 'grin',   eyes: 'closed', tilt: -0.1,  lift: 0.015 },
  sad:         { mouth: 'frown',  eyes: 'open',   tilt: -0.45, lift: 0.004, lid: 0.35, lidTilt: -0.35, look: [0, -0.6] },
  worried:     { mouth: 'wobble', eyes: 'open',   tilt: -0.5,  lift: 0.012, lid: 0.12, lidTilt: -0.25 },
  cry:         { mouth: 'wail',   eyes: 'squint', tilt: -0.5,  lift: 0.004, tears: true },
  angry:       { mouth: 'frown',  eyes: 'open',   tilt: 0.5,   lift: -0.014, lid: 0.38, lidTilt: 0.45, cheeks: 'angry' },
  surprised:   { mouth: 'o',      eyes: 'wide',   tilt: 0,     lift: 0.03 },
  embarrassed: { mouth: 'wobble', eyes: 'open',   tilt: -0.35, lift: 0.006, lid: 0.3, look: [-0.7, -0.7], cheeks: 'blush' },
};
export const FEELING_NAMES = Object.keys(FEELINGS);

const INK = 0x2a1a22, MOUTH = 0x7a2433, TEAR = 0x7fd3ff;
const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);
const SITTING = new Set(['sit', 'play', 'crySit']);   // floor-sitting actions

/* ======== the person ======== */

export class Person {
  constructor(spec) {
    this.spec = spec;
    this.id = spec.id;
    this.P = spec.adult ? ADULT : KID;
    this.object = new THREE.Group();
    this.object.name = spec.id;
    this.object.userData.person = this;
    if (spec.height) this.object.scale.setScalar(spec.height);   // a little taller or shorter than usual

    this.joints = {};
    this.buildBody();
    this.buildHead();
    this.pose = restPose();
    this.action = 'idle';
    this.t = Math.random() * 10;
    this.blinkIn = 1 + Math.random() * 3;
    this.held = { L: null, R: null };
    this.move = null;
    this.avoid = new THREE.Vector3();   // sideways nudge from the director, to walk round people
    this.radius = (spec.adult ? 0.27 : 0.21) * (spec.height || 1);   // personal space on the floor
    this.setFeel('neutral');
  }

  /* ---------- body ---------- */

  buildBody() {
    const { spec, P } = this;
    const skin = spec.skin, shirt = spec.shirt, bottom = spec.bottom || 'trousers', pants = spec.pants;
    const dressLike = bottom === 'dress' || bottom === 'skirt';

    const hips = this.hips = new THREE.Group();
    hips.position.y = P.hipY;
    this.object.add(hips);
    const pelvis = part(sphere(P.torsoBot * 0.98), bottom === 'dress' ? shirt : pants, 0, 0.02, 0);
    pelvis.scale.set(1, 0.6, 0.8);
    hips.add(pelvis);
    if (dressLike) {
      const s = part(cyl(P.torsoBot * 0.95, P.torsoBot * 1.75, P.skirt, 20, true), bottom === 'dress' ? shirt : pants, 0, -P.skirt / 2 + 0.03, 0, { side: THREE.DoubleSide });
      s.scale.z = 0.85;
      hips.add(s);
    }

    // legs
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const hip = new THREE.Group();
      hip.position.set(s * P.hipX, 0, 0);
      hip.rotation.order = 'YXZ';
      hips.add(hip);
      const thighCol = bottom === 'trousers' || bottom === 'shorts' ? pants : skin;
      const shinCol = bottom === 'trousers' ? pants : (spec.socks || skin);
      const thigh = part(capsule(P.legR * (bottom === 'shorts' ? 1.12 : 1), P.thigh), thighCol, 0, -P.thigh / 2, 0);
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -P.thigh;
      hip.add(knee);
      knee.add(part(sphere(P.legR * 0.97, 10, 8), bottom === 'shorts' ? skin : shinCol));
      knee.add(part(capsule(P.legR * 0.92, P.shin), shinCol, 0, -P.shin / 2, 0));
      const [fw, fh, fd] = P.foot;
      const shoe = part(box(fw, fh, fd, 0.03), spec.shoes, 0, -P.shin - fh * 0.2, fd * 0.2);
      knee.add(shoe);
      // the shoe's bottom corners and the knee's front, checked against the floor every frame
      this.floorPoints ??= [];
      for (const x of [-fw / 2, fw / 2]) for (const z of [-fd / 2, fd / 2]) this.floorPoints.push([shoe, new THREE.Vector3(x, -fh / 2, z)]);
      this.floorPoints.push([knee, new THREE.Vector3(0, 0, P.legR)], [knee, new THREE.Vector3(0, -P.legR, 0)]);
      this.joints['hip' + side] = hip;
      this.joints['knee' + side] = knee;
    }

    // torso, squashed front to back
    const torso = this.torso = new THREE.Group();
    torso.position.y = 0.04;
    hips.add(torso);
    this.joints.torso = torso;
    const body = new THREE.Group();
    body.scale.z = 0.8;
    torso.add(body);
    const h = P.torsoH * 0.72;
    body.add(part(cyl(P.torsoTop, P.torsoBot, h, 20), shirt, 0, h / 2, 0));
    const shoulders = part(sphere(P.torsoTop, 20, 10), shirt, 0, h, 0);
    shoulders.scale.y = 0.6;
    body.add(shoulders);
    const belly = part(sphere(P.torsoBot, 20, 10), shirt, 0, 0, 0);
    belly.scale.y = 0.45;
    body.add(belly);
    const rAt = (y) => P.torsoBot + (P.torsoTop - P.torsoBot) * (y / h);
    if (spec.stripes) {
      for (let y = h * 0.15; y < h * 0.95; y += h * 0.2) {
        body.add(part(cyl(rAt(y) + 0.004, rAt(y + 0.03) + 0.004, 0.035, 20, true), spec.stripes, 0, y, 0));
      }
    }
    if (spec.badge === 'star') {
      const star = part(starGeometry(0.045 * (P.torsoTop / 0.125)), spec.badgeColor || 0xffd23f, 0, h * 0.55, rAt(h * 0.55) - 0.002);
      body.add(star);
    }
    const neckR = spec.adult ? 0.05 : 0.045;
    torso.add(part(cyl(neckR, neckR * 1.1, 0.09), skin, 0, P.neck - 0.035, 0));
    if (spec.necklace) {
      // beads lying round the base of the neck, dipping at the front
      const capH = P.torsoTop * 0.6;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2, y = capH * (0.85 - 0.45 * Math.max(0, Math.cos(a)));
        const r = P.torsoTop * Math.sqrt(1 - (y / capH) ** 2) + 0.01;   // on the rounded shoulders
        body.add(part(sphere(0.016, 8, 6), spec.necklace, Math.sin(a) * r, h + y, Math.cos(a) * r));
      }
    }

    // arms
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const sh = new THREE.Group();
      sh.position.set(s * P.shoulderX, P.shoulderY, 0);
      torso.add(sh);
      sh.add(part(sphere(P.armR * 1.05, 12, 8), shirt));
      sh.add(part(capsule(P.armR * 1.05, P.upper), shirt, 0, -P.upper / 2, 0));
      const el = new THREE.Group();
      el.position.y = -P.upper;
      el.rotation.order = 'YXZ';
      sh.add(el);
      const forearm = spec.sleeves === 'long' ? shirt : skin;
      el.add(part(sphere(P.armR * 0.97, 10, 8), forearm));
      el.add(part(capsule(P.armR * 0.92, P.lower), forearm, 0, -P.lower / 2, 0));
      const handY = -P.lower - P.handR * 0.55;
      el.add(part(sphere(P.handR, 12, 8), skin, 0, handY, 0));
      const socket = new THREE.Group();
      socket.position.set(0, handY - P.handR * 0.3, P.handR * 0.4);
      el.add(socket);
      this.joints['shoulder' + side] = sh;
      this.joints['elbow' + side] = el;
      this['socket' + side] = socket;
    }
  }

  /* ---------- head and face ---------- */

  buildHead() {
    const { spec, P } = this;
    const R = P.headR, k = R / 0.215, c = new THREE.Vector3(0, P.headY, 0);
    const neck = this.neck = new THREE.Group();
    neck.position.y = P.neck;
    this.torso.add(neck);
    this.joints.neck = neck;
    const head = part(sphere(R, 28, 20), spec.skin, c.x, c.y, c.z);
    head.scale.set(1, 0.96, 0.95);
    neck.add(head);

    // ears and nose
    for (const s of [1, -1]) {
      const ear = part(sphere(0.045 * k, 10, 8), spec.skin, s * R * 0.96, c.y - 0.01 * k, -0.01);
      ear.scale.set(0.6, 1, 0.8);
      neck.add(ear);
    }
    const onHead = (obj, yaw, pitch, out = 0) => {
      const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      obj.position.copy(c).addScaledVector(d, R * 0.955 + out);
      obj.quaternion.setFromUnitVectors(Z, d);
      neck.add(obj);
      return obj;
    };
    this.onHead = onHead;
    onHead(part(sphere(0.022 * k, 10, 8), shade(spec.skin, 0.9)), 0, -0.1, 0.004);

    // painted faces for everyone; { face: '3d' } brings back the older separate 3D pieces
    if (spec.face !== '3d') {
      this.face = null;
      this.painted = new PaintedFace({ neck, c, R, scale: head.scale, skin: spec.skin, brows: spec.brows || shade(spec.hair, 0.75) });
    } else {
      this.buildFace(neck, c, R, k, onHead);
    }

    this.buildHair(neck, c, R, k);
    if (spec.glasses) {
      for (const s of [1, -1]) onHead(part(new THREE.TorusGeometry(0.044 * k, 0.007 * k, 6, 20), spec.glasses), s * 0.34, 0.02, 0.022 * k);
      onHead(part(capsule(0.006 * k, 0.04 * k, 4), spec.glasses), 0, 0.04, 0.03 * k).rotation.z = Math.PI / 2;
    }
  }

  // the 3D face: separate eyes, lids, brows, cheeks, mouths and tears placed on the head
  buildFace(neck, c, R, k, onHead) {
    const { spec } = this;
    const f = this.face = { k, eyes: [], brows: [], mouths: {}, tears: [], cheeks: [] };

    // eyes: open (a black bead with two shines) or closed (a ∩ arc), and an upper eyelid in skin
    // colour that slides down over the bead for sad, cross or embarrassed
    for (const s of [1, -1]) {
      const eye = onHead(new THREE.Group(), s * 0.34, 0.02, 0.002);
      const open = new THREE.Group();
      const bead = part(sphere(0.036 * k, 14, 10), INK);
      bead.scale.set(0.85, 1.15, 0.5);
      bead.castShadow = false;
      const shine = part(sphere(0.011 * k, 8, 6), 0xffffff, 0.01 * k, 0.016 * k, 0.015 * k);
      const shine2 = part(sphere(0.005 * k, 6, 4), 0xffffff, -0.009 * k, -0.013 * k, 0.016 * k);
      shine.castShadow = shine2.castShadow = false;
      open.add(bead, shine, shine2);
      const closed = part(new THREE.TorusGeometry(0.024 * k, 0.007 * k, 6, 14, Math.PI), INK, 0, -0.008 * k, 0);
      const lidPivot = new THREE.Group();
      const lid = part(new THREE.CircleGeometry(0.058 * k, 18, 0, Math.PI), spec.skin, 0, 0, 0.021 * k);
      lid.scale.y = 0.55;
      lid.castShadow = false;
      lidPivot.add(lid);
      eye.add(open, closed, lidPivot);
      f.eyes.push({ eye, open, closed, lid, lidPivot, s });
    }
    f.lid = 0; f.lidTilt = 0; f.look = [0, 0];
    // brows: a short thick arch on a pivot that we tilt and lift per feeling
    for (const s of [1, -1]) {
      const g = onHead(new THREE.Group(), s * 0.34, 0.27, 0.004);
      const pivot = new THREE.Group();
      const arch = part(new THREE.TorusGeometry(0.06 * k, 0.012 * k, 6, 14, 1.0), spec.brows || shade(spec.hair, 0.75));
      arch.rotation.z = Math.PI / 2 - 0.5;
      arch.position.y = -0.056 * k;
      arch.castShadow = false;
      pivot.add(arch);
      g.add(pivot);
      f.brows.push({ bar: pivot, s });
    }
    f.tilt = 0; f.lift = 0;
    // cheeks
    for (const s of [1, -1]) {
      const ch = onHead(part(sphere(0.036 * k, 12, 8), 0xff8fa3, 0, 0, 0, { transparent: true, opacity: 0.45 }), s * 0.62, -0.2, -0.004);
      ch.scale.set(1, 0.7, 0.25);
      ch.castShadow = false;
      f.cheeks.push(ch);
    }
    // mouths: one group on the face, one child per shape
    const mouth = f.mouth = onHead(new THREE.Group(), 0, -0.38, 0.006);
    const flat = (g, color = MOUTH) => { const m = part(g, color); m.castShadow = false; return m; };
    f.mouths.smile = flat(new THREE.TorusGeometry(0.042 * k, 0.009 * k, 6, 16, Math.PI), INK);
    f.mouths.smile.rotation.z = Math.PI;
    f.mouths.smile.position.y = 0.02 * k;
    f.mouths.grin = flat(new THREE.CircleGeometry(0.052 * k, 20, Math.PI, Math.PI));
    f.mouths.grin.position.y = 0.012 * k;
    f.mouths.grin.add(flat(new THREE.CircleGeometry(0.022 * k, 12, Math.PI, Math.PI), 0xff7a8a));
    f.mouths.grin.children[0].position.set(0, -0.028 * k, 0.001);
    const teeth = flat(new THREE.PlaneGeometry(0.07 * k, 0.012 * k), 0xffffff);
    teeth.position.set(0, -0.007 * k, 0.0012);
    f.mouths.grin.add(teeth);
    f.mouths.frown = flat(new THREE.TorusGeometry(0.036 * k, 0.009 * k, 6, 16, Math.PI), INK);
    f.mouths.frown.position.y = -0.022 * k;
    f.mouths.wail = flat(new THREE.CircleGeometry(0.046 * k, 20, 0, Math.PI));
    f.mouths.wail.position.y = -0.02 * k;
    f.mouths.wail.scale.y = 1.15;
    const tongue = flat(new THREE.CircleGeometry(0.022 * k, 12, 0, Math.PI), 0xff7a8a);
    tongue.position.z = 0.001;
    f.mouths.wail.add(tongue);
    f.mouths.o = flat(new THREE.CircleGeometry(0.026 * k, 16));
    f.mouths.o.scale.set(0.85, 1.15, 1);
    f.mouths.flat = flat(capsule(0.009 * k, 0.045 * k, 6), INK);
    f.mouths.flat.rotation.z = Math.PI / 2;
    f.mouths.talk = flat(new THREE.CircleGeometry(0.032 * k, 16));
    const wave = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
      const x = -0.036 + i * 0.009;
      return new THREE.Vector3(x * k, 0.005 * k * Math.sin((i / 8) * Math.PI * 3), 0);
    }));
    f.mouths.wobble = flat(new THREE.TubeGeometry(wave, 24, 0.008 * k, 6), INK);
    f.mouths.wobble.position.y = -0.006 * k;
    for (const m of Object.values(f.mouths)) mouth.add(m);
    // tears: two drops per eye that run down the cheek
    for (const s of [1, -1]) for (let i = 0; i < 2; i++) {
      const d = part(sphere(0.013 * k, 8, 6), TEAR, 0, 0, 0, { transparent: true, opacity: 0.9 });
      d.material = d.material.clone();   // each drop fades on its own
      d.scale.set(1, 1.4, 0.8);
      d.castShadow = false;
      neck.add(d);
      f.tears.push({ d, s, phase: i * 0.5 });
    }
  }

  buildHair(neck, c, R, k) {
    const { spec } = this;
    const col = spec.hair, hm = mat(col, { side: THREE.DoubleSide });
    const add = (m) => { neck.add(m); return m; };
    const cap = (thetaLen, tilt, rk = 1.06) => {
      const m = part(new THREE.SphereGeometry(R * rk, 28, 14, 0, Math.PI * 2, 0, thetaLen), hm, c.x, c.y, c.z);
      m.rotation.x = -tilt;
      return add(m);
    };
    const at = (yaw, pitch, out) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(R + out).add(c);
    const style = spec.hairStyle;

    if (style === 'spiky') {
      cap(1.35, 0.5);
      // a soft fringe along the hairline, then spikes on the crown sweeping up and back,
      // well clear of the eyebrows
      for (let i = 0; i < 6; i++) add(part(sphere(0.045 * k, 10, 8), hm)).position.copy(at(-0.75 + i * 0.3, 0.72, 0.015 * k));
      const spikes = [[-0.6, 1.0], [-0.3, 1.05], [0, 1.08], [0.3, 1.05], [0.6, 1.0], [-0.45, 1.3], [-0.15, 1.35], [0.15, 1.35], [0.45, 1.3]];
      for (const [yaw, pitch] of spikes) {
        const dir = at(yaw, pitch, 0).sub(c).normalize();
        const cone = part(new THREE.ConeGeometry(0.05 * k, 0.12 * k, 6), hm);
        cone.position.copy(c).addScaledVector(dir, R * 1.02);
        cone.quaternion.setFromUnitVectors(Y, dir.clone().add(new THREE.Vector3(0, 0.35, -0.3)).normalize());
        add(cone);
      }
    } else if (style === 'short') {
      cap(1.4, 0.45);
      for (let i = 0; i < 6; i++) add(part(sphere(0.045 * k, 10, 8), hm)).position.copy(at(-0.75 + i * 0.3, 0.7, 0.02 * k));
    } else if (style === 'buzz') {
      cap(1.45, 0.4, 1.03);
    } else if (style === 'curly') {
      cap(1.4, 0.35, 1.02);
      const axis = new THREE.Vector3(0, Math.cos(0.35), -Math.sin(0.35));
      const n = 160;
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.angleTo(axis) > 1.42) continue;
        add(part(sphere(0.06 * k, 8, 6), hm)).position.copy(c).addScaledVector(d, R * 1.04);
      }
    } else if (style === 'bob') {
      cap(1.25, 0.15, 1.07);
      add(part(new THREE.SphereGeometry(R * 1.1, 28, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.5, 1.35), hm, c.x, c.y, c.z));
      add(part(new THREE.SphereGeometry(R * 1.08, 20, 8, Math.PI / 2 - 0.95, 1.9, 0.25, 0.8), hm, c.x, c.y, c.z));
    } else if (style === 'pigtails') {
      cap(1.4, 0.3);
      for (const s of [1, -1]) {
        const tail = add(part(sphere(0.075 * k, 12, 10), hm, s * (R + 0.04 * k), c.y + 0.02 * k, -0.06 * k));
        tail.scale.set(0.85, 1.35, 0.85);
        tail.rotation.z = s * 0.6;
        add(part(new THREE.TorusGeometry(0.03 * k, 0.012 * k, 6, 12), spec.ties || 0xff5a8a, s * (R - 0.0), c.y + 0.06 * k, -0.06 * k)).rotation.y = Math.PI / 2;
      }
    } else if (style === 'ponytail') {
      cap(1.4, 0.35);
      add(part(sphere(0.03 * k, 8, 6), spec.ties || 0xffd23f, 0, c.y + R * 0.5, -R * 0.92));
      const tail = add(part(capsule(0.05 * k, 0.16 * k), hm, 0, c.y + R * 0.22, -R * 1.08));
      tail.rotation.x = 0.35;
    } else if (style === 'bun') {
      cap(1.35, 0.3, 1.05);
      add(part(sphere(0.085 * k, 14, 10), hm, 0, c.y + R * 0.72, -R * 0.72));
    } else if (style === 'long') {
      cap(1.35, 0.25);
      add(part(new THREE.CylinderGeometry(R * 1.04, R * 1.18, R * 1.9, 24, 1, true, Math.PI - 1.55, 3.1), hm, 0, c.y - R * 0.55, -0.01));
    }
  }

  /* ---------- feelings, talking, props ---------- */

  setFeel(name) {
    const e = FEELINGS[name] || FEELINGS.neutral, f = this.face;
    this.feel = name;
    if (this.painted) { this.painted.setFeel(name); return; }
    for (const [id, m] of Object.entries(f.mouths)) m.visible = id === e.mouth;
    f.baseMouth = e.mouth;
    for (const { open, closed } of f.eyes) {
      open.visible = e.eyes !== 'closed';
      closed.visible = e.eyes === 'closed';
      open.scale.set(e.eyes === 'wide' ? 1.2 : 1, e.eyes === 'squint' ? 0.3 : e.eyes === 'wide' ? 1.2 : 1, 1);
    }
    if (this.mouthPop === undefined) {   // the first face is set at once, later ones ease in
      f.tilt = e.tilt; f.lift = e.lift; f.lid = e.lid || 0; f.lidTilt = e.lidTilt || 0; f.look = [...(e.look || [0, 0])];
    }
    this.mouthPop = 0;
    const cheek = { angry: [0xff4d4d, 0.65, 1], blush: [0xff6f8a, 0.8, 1.35] }[e.cheeks] || [0xff8fa3, 0.45, 1];
    for (const ch of f.cheeks) {
      ch.material = mat(cheek[0], { transparent: true, opacity: cheek[1] });
      ch.scale.set(cheek[2], 0.7 * cheek[2], 0.25);
    }
    for (const t of f.tears) t.d.visible = !!e.tears;
  }

  // Change into other trousers (or skirt): every part in the old colour takes the new one.
  setPants(hex) {
    const from = this.pants ?? this.spec.pants;
    if (from === hex) return;
    this.object.traverse((m) => {
      if (m.isMesh && m.material.isMeshToonMaterial && m.material.color.getHex() === new THREE.Color(from).getHex() && !m.material.map) {
        m.material = mat(hex, m.material.side === THREE.DoubleSide ? { side: THREE.DoubleSide } : {});
      }
    });
    this.pants = hex;
  }

  play(action) {
    if (ACTIONS[action]) this.action = action;
  }

  // level: optional function giving the voice's loudness (0 to 1) so the mouth follows the clip
  talk(on, level = null) {
    this.talking = on;
    this.talkLevel = on ? level : null;
    this.mouthOpen = 0;
  }

  // Put a prop (from props.js) in a hand, held by its grip point.
  hold(obj, side = 'R') {
    this.release(side);
    this['socket' + side].add(obj);
    obj.position.set(0, 0, 0);
    if (obj.userData.grip) obj.children[0].position.copy(obj.userData.grip).negate();
    this.held[side] = obj;
  }

  release(side = 'R') {
    const obj = this.held[side];
    if (obj) {
      obj.removeFromParent();
      obj.children[0].position.set(0, 0, 0);
      obj.quaternion.identity();
      this.held[side] = null;
    }
    return obj;
  }

  // Walk to a point on the floor, then face `faceYaw` (radians, 0 = +z). Resolves on arrival, then
  // stands holding whatever is in hand, or idle. pace < 1 is slower than usual for the gait.
  walkTo(to, faceYaw = null, gait = 'walk', pace = 1) {
    return new Promise((resolve) => {
      this.move = { to: to.clone().setY(0), faceYaw, gait, pace, resolve };
      this.play(gait);
    });
  }

  // No foot or knee below the floor: if a pose would push one through, lift the body just enough.
  // The floor is wherever the person stands (the root's height, e.g. on the slide's chute).
  keepFeetUp() {
    if (this.sliding) return;     // on the slide the feet are meant to be lower than the bottom
    const o = this.object;
    o.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let low = Infinity;
    for (const [m, local] of this.floorPoints) low = Math.min(low, v.copy(local).applyMatrix4(m.matrixWorld).y);
    const floor = o.getWorldPosition(v).y, under = floor + 0.004 - low;
    if (under > 0) this.hips.position.y += under / (o.scale.y || 1);
  }

  // Stop walking where we are (someone is standing on the spot we were heading for).
  arrive() {
    const m = this.move;
    if (!m) return;
    this.move = null;
    this.play(this.held.L || this.held.R ? 'hold' : 'idle');
    this.turn = m.faceYaw !== null ? m.faceYaw : Math.atan2(m.to.x - this.object.position.x, m.to.z - this.object.position.z);
    m.resolve();
  }

  /* ---------- every frame ---------- */

  update(dt) {
    this.t += dt;
    const t = this.t, o = this.object;

    if (this.move) {
      const m = this.move, d = m.to.clone().sub(o.position).setY(0), dist = d.length(), step = this.P[m.gait] * m.pace * dt;
      const dir = d.clone().normalize();
      if (dist > 0.3 && this.avoid.lengthSq() > 0) dir.add(this.avoid).setY(0).normalize();
      if (dist > 0.01) turnTowards(o, Math.atan2(dir.x, dir.z), dt * 8);
      if (dist <= step) {
        o.position.x = m.to.x;   // the height is the ground's (the director keeps people on it)
        o.position.z = m.to.z;
        this.move = null;
        this.play(this.held.L || this.held.R ? 'hold' : 'idle');
        if (m.faceYaw !== null) this.turn = m.faceYaw;
        m.resolve();
      } else {
        o.position.addScaledVector(dir, step);
      }
    } else if (this.turn !== undefined && this.turn !== null) {
      if (turnTowards(o, this.turn, dt * 6)) this.turn = null;
    }

    // body: blend every joint towards the action's pose
    const target = restPose();
    ACTIONS[this.action](target, t, this.P);
    // sitting with a toy in hand: hold it up in front, turning it a little, instead of letting the arm hang
    if (SITTING.has(this.action)) for (const [side, s] of [['L', 1], ['R', -1]]) {
      if (!this.held[side]) continue;
      target['shoulder' + side] = [-0.75 + 0.08 * Math.sin(t * 2.5 + s), 0, -s * 0.12];
      target['elbow' + side] = [-1.15, -s * 0.25, 0];
    }
    const a = 1 - Math.exp(-dt * 14);
    for (const [name, j] of Object.entries(this.joints)) {
      const p = target[name], r = j.rotation;
      r.x += (p[0] - r.x) * a; r.y += (p[1] - r.y) * a; r.z += (p[2] - r.z) * a;
    }
    this.pose.bob += (target.bob - this.pose.bob) * a;
    this.hips.position.y = this.P.hipY + this.pose.bob;
    this.keepFeetUp();

    // face: blinking, talking, tears
    if (this.painted) {
      this.blinkIn -= dt;
      if (this.blinkIn < 0) this.blinkIn = 2 + Math.random() * 3;
      let talk = null;
      if (this.talking) {
        const lv = this.talkLevel ? this.talkLevel() : null;
        const want = lv === null ? 0.25 + 0.75 * Math.abs(Math.sin(t * 11) * Math.sin(t * 4.3 + 1)) : Math.min(1, lv * 1.6);
        this.mouthOpen += (want - this.mouthOpen) * Math.min(1, dt * 25);
        talk = this.mouthOpen;
      }
      this.painted.update(dt, { blink: this.blinkIn < 0.12, talk });
    } else {
          const f = this.face;
      this.blinkIn -= dt;
      if (this.blinkIn < 0) this.blinkIn = 2 + Math.random() * 3;
      const blink = this.blinkIn < 0.12;
      const e = FEELINGS[this.feel];
      const ease = 1 - Math.exp(-dt * 10);
      f.tilt += (e.tilt - f.tilt) * ease;
      f.lift += (e.lift - f.lift) * ease;
      f.lid += ((e.lid || 0) - f.lid) * ease;
      f.lidTilt += ((e.lidTilt || 0) - f.lidTilt) * ease;
      const look = e.look || [0, 0];
      f.look[0] += (look[0] - f.look[0]) * ease;
      f.look[1] += (look[1] - f.look[1]) * ease;
      for (const { bar, s } of f.brows) {
        bar.rotation.z = s * f.tilt;
        bar.position.y = f.lift * f.k;
      }
      for (const { open, lid, lidPivot, s } of f.eyes) {
        open.scale.y = blink ? 0.1 : e.eyes === 'squint' ? 0.3 : e.eyes === 'wide' ? 1.2 : 1;
        open.position.set(-f.look[0] * 0.008 * f.k, f.look[1] * 0.008 * f.k, 0);   // where the eyes look
        // the lid's straight edge comes down from the top of the eye; the lid hides when the eye is shut
        lid.visible = open.visible && !blink && f.lid > 0.02;
        lid.position.y = (0.042 - f.lid * 0.084) * f.k;
        lidPivot.rotation.z = s * f.lidTilt;
      }
      this.mouthPop = Math.min(1, (this.mouthPop ?? 1) + dt * 6);
      const pop = 0.7 + 0.3 * (1 - (1 - this.mouthPop) ** 2);
      f.mouth.scale.x = pop;
      let talkOpen = 0;
      if (this.talking) {
        const lv = this.talkLevel ? this.talkLevel() : null;
        const want = lv === null ? 0.25 + 0.75 * Math.abs(Math.sin(t * 11) * Math.sin(t * 4.3 + 1)) : Math.min(1, lv * 1.6);
        this.mouthOpen += (want - this.mouthOpen) * Math.min(1, dt * 25);
        talkOpen = this.mouthOpen;
      }
      const talkShape = this.talking && !['wail', 'o', 'grin'].includes(f.baseMouth);
      for (const [id, m] of Object.entries(f.mouths)) m.visible = talkShape ? id === 'talk' : id === f.baseMouth;
      f.mouths.talk.scale.set(1, 0.25 + talkOpen, 1);
      if (this.talking && !talkShape) f.mouth.scale.y = (0.8 + 0.4 * talkOpen) * pop; else f.mouth.scale.y = pop;
      if (e.tears) for (const tr of f.tears) {
        const u = ((t * 0.9 + tr.phase) % 1);
        const pitch = -0.02 - u * 0.55, yaw = tr.s * (0.36 + u * 0.1);
        const R = this.P.headR;
        tr.d.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(R * 0.99).add(new THREE.Vector3(0, this.P.headY, 0));
        tr.d.material.opacity = 0.95 * (1 - u * u);
      }

    }

    // props stay upright in the hand
    o.updateMatrixWorld(true);
    const rootQ = o.getWorldQuaternion(new THREE.Quaternion());
    for (const side of ['L', 'R']) {
      const obj = this.held[side];
      if (!obj) continue;
      const socket = this['socket' + side], pq = socket.getWorldQuaternion(new THREE.Quaternion());
      obj.quaternion.copy(pq.clone().invert().multiply(rootQ));
      // and never below the floor: if it would go through, it rides up in the hand
      obj.position.set(0, 0, 0);
      obj.updateMatrixWorld(true);
      const low = new THREE.Box3().setFromObject(obj).min.y, floor = o.getWorldPosition(new THREE.Vector3()).y + 0.005;
      if (low < floor) obj.position.copy(new THREE.Vector3(0, (floor - low) / (o.scale.y || 1), 0).applyQuaternion(pq.invert()));
    }
  }
}

/* ======== helpers ======== */

function turnTowards(o, yaw, rate) {
  let d = yaw - o.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(d) < 0.01) { o.rotation.y = yaw; return true; }
  o.rotation.y += d * Math.min(1, rate);
  return false;
}

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

function starGeometry(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
}
