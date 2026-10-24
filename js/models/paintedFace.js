// A painted face: the eyes, brows, cheeks and mouth are drawn on a canvas and shown on a thin shell
// that hugs the front of the head, projected straight from the front. Features are drawn where they
// appear from the front and follow the head's curve when seen from the side, instead of floating on
// it like separate 3D pieces. Each feeling is a set of numbers (how open the eyes are, the eyelid, the
// gaze, the brows, the mouth's curve and opening); the face eases between them and redraws when they
// change, when it blinks, talks or cries.
import * as THREE from 'three';
import { mat } from '../toon.js';

const SIZE = 384;            // canvas pixels across the face (more is sharper, slower to redraw)
const INK = '#2a1a22', MOUTH = '#7a2433', TONGUE = '#ff7a8a', TEAR = 'rgba(127,211,255,0.95)';

// Drawing settings per feeling. eyes: 1 open, 0 shut; mode: 'open' | 'smile' (∩) | 'squeeze' (> <).
// lid 0-1 and lidTilt (+ inner corners down); look [x, y]; brow tilt (− inner ends up) and lift;
// mouth curve (−1 frown … 1 smile), open (0-1), width (1 normal), teeth, tongue, wobble.
const LOOKS = {
  neutral:     { eyes: 1, mode: 'open', lid: 0,    lidTilt: 0,     look: [0, 0],       tilt: 0,     lift: 0,     curve: 0.5,  open: 0,    width: 0.85 },
  happy:       { eyes: 1, mode: 'open', lid: 0,    lidTilt: 0,     look: [0, 0],       tilt: -0.1,  lift: 0.04,  curve: 1,    open: 0.55, width: 1.1,  teeth: true, tongue: true },
  joy:         { eyes: 1, mode: 'smile', lid: 0,   lidTilt: 0,     look: [0, 0],       tilt: -0.1,  lift: 0.06,  curve: 1,    open: 0.7,  width: 1.15, teeth: true, tongue: true },
  sad:         { eyes: 1, mode: 'open', lid: 0.35, lidTilt: -0.35, look: [0, -0.6],    tilt: -0.45, lift: 0.02,  curve: -0.7, open: 0,    width: 0.8 },
  worried:     { eyes: 1, mode: 'open', lid: 0.12, lidTilt: -0.25, look: [0, 0],       tilt: -0.5,  lift: 0.05,  curve: 0,    open: 0,    width: 0.75, wobble: true },
  cry:         { eyes: 1, mode: 'squeeze', lid: 0, lidTilt: 0,     look: [0, 0],       tilt: -0.5,  lift: 0.02,  curve: -0.9, open: 0.8,  width: 0.8,  tongue: true, tears: true },
  angry:       { eyes: 1, mode: 'open', lid: 0.38, lidTilt: 0.45,  look: [0, 0],       tilt: 0.5,   lift: -0.05, curve: -0.6, open: 0.12, width: 0.85, teeth: true, cheeks: 'angry' },
  surprised:   { eyes: 1.18, mode: 'open', lid: 0, lidTilt: 0,     look: [0, 0],       tilt: 0,     lift: 0.12,  curve: 0,    open: 0.6,  width: 0.42 },
  embarrassed: { eyes: 1, mode: 'open', lid: 0.3,  lidTilt: 0,     look: [-0.7, -0.7], tilt: -0.35, lift: 0.02,  curve: 0,    open: 0,    width: 0.7,  wobble: true, cheeks: 'blush' },
};
const NUMBERS = ['eyes', 'lid', 'lidTilt', 'tilt', 'lift', 'curve', 'open', 'width'];

export class PaintedFace {
  // neck: the group the head hangs from; c: head centre in it; R: head radius; scale: the head's scale
  constructor({ neck, c, R, scale, skin, brows }) {
    this.R = R;
    this.brows = '#' + new THREE.Color(brows).getHexString();
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SIZE;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;

    // the shell: the front of a sphere just outside the head, with UVs projected from the front so
    // the canvas reads like a front view of the face
    const geo = new THREE.SphereGeometry(R * 1.006, 48, 32, Math.PI / 2 - 1.35, 2.7, 0.7, 1.7);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * R), 0.5 + pos.getY(i) / (2 * R));
    const m = new THREE.MeshToonMaterial({ map: this.tex, gradientMap: mat(0).gradientMap, transparent: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(geo, m);
    this.mesh.position.copy(c);
    this.mesh.scale.copy(scale);
    neck.add(this.mesh);

    this.now = { ...LOOKS.neutral, look: [0, 0] };
    this.target = LOOKS.neutral;
    this.t = 0;
    this.key = '';
  }

  setFeel(name) {
    this.target = LOOKS[name] || LOOKS.neutral;
    const n = this.now, tg = this.target;
    for (const k of ['mode', 'teeth', 'tongue', 'wobble', 'tears', 'cheeks']) n[k] = tg[k];
  }

  // talk: 0-1 how open the mouth is for speech, or null when not talking
  update(dt, { blink, talk }) {
    this.t += dt;
    const n = this.now, tg = this.target, a = 1 - Math.exp(-dt * 10);
    for (const k of NUMBERS) n[k] += ((tg[k] ?? 0) - n[k]) * a;
    n.look[0] += (tg.look[0] - n.look[0]) * a;
    n.look[1] += (tg.look[1] - n.look[1]) * a;
    // redraw only when something visible changed
    const key = NUMBERS.map((k) => n[k].toFixed(2)).join() + n.look.map((v) => v.toFixed(2)) + n.mode + blink
      + (talk === null ? '' : talk.toFixed(2)) + (n.tears ? Math.floor(this.t * 20) : '');
    if (key === this.key) return;
    this.key = key;
    this.draw(blink, talk);
    this.tex.needsUpdate = true;
  }

  /* ---------- drawing (canvas units: the face is SIZE across, 2R in the world) ---------- */

  // head-local x, y (metres from the head's centre) to canvas pixels
  px(x, y) {
    return [(0.5 + x / (2 * this.R)) * SIZE, (0.5 - y / (2 * this.R)) * SIZE];
  }

  draw(blink, talk) {
    const { g, R } = this, n = this.now, u = SIZE / 2;   // u: canvas pixels per head radius
    g.clearRect(0, 0, SIZE, SIZE);
    g.lineCap = g.lineJoin = 'round';

    // cheeks: soft round blush
    const blush = { angry: ['255,77,77', 0.6, 1.1], blush: ['255,105,135', 0.75, 1.35] }[n.cheeks] || ['255,143,163', 0.45, 1];
    for (const s of [1, -1]) {
      const [cx, cy] = this.px(s * 0.56 * R, -0.2 * R), r = 0.15 * u * blush[2];
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grd.addColorStop(0, `rgba(${blush[0]},${blush[1]})`);
      grd.addColorStop(1, `rgba(${blush[0]},0)`);
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2); g.fill();
    }

    // eyes
    for (const s of [1, -1]) {
      const [ex, ey] = this.px(s * 0.33 * R, 0.03 * R);
      const rx = 0.135 * u * n.eyes, ry = 0.18 * u * n.eyes;
      if (blink || n.mode === 'smile') {
        g.strokeStyle = INK; g.lineWidth = 0.045 * u;
        g.beginPath();
        if (n.mode === 'smile') g.arc(ex, ey + 0.06 * u, rx * 0.9, Math.PI * 1.15, Math.PI * 1.85);   // happy ∩
        else g.arc(ex, ey - 0.12 * u, rx * 0.9, Math.PI * 0.25, Math.PI * 0.75);                   // a shut eye ∪
        g.stroke();
        continue;
      }
      if (n.mode === 'squeeze') {   // > <
        g.strokeStyle = INK; g.lineWidth = 0.045 * u;
        g.beginPath(); g.moveTo(ex - s * rx, ey - ry * 0.5); g.lineTo(ex + s * rx * 0.6, ey); g.lineTo(ex - s * rx, ey + ry * 0.5); g.stroke();
        continue;
      }
      g.save();
      // the eyelid: everything above a (slanted) line is hidden
      if (n.lid > 0.02) {
        // the line y = edge − slant·dx; with lidTilt > 0 the corner nearer the middle of the face is lower
        const edge = ey - ry + n.lid * 2 * ry, slant = s * n.lidTilt;
        g.beginPath();
        g.moveTo(ex - 2 * rx, edge + slant * 2 * rx);
        g.lineTo(ex + 2 * rx, edge - slant * 2 * rx);
        g.lineTo(ex + 2 * rx, ey + 2 * ry); g.lineTo(ex - 2 * rx, ey + 2 * ry); g.closePath();
        g.clip();
      }
      const lx = ex - n.look[0] * 0.04 * u, ly = ey - n.look[1] * 0.04 * u;
      g.fillStyle = INK;
      g.beginPath(); g.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(lx + rx * 0.35, ly - ry * 0.4, rx * 0.36, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(lx - rx * 0.35, ly + ry * 0.4, rx * 0.16, 0, Math.PI * 2); g.fill();
      g.restore();
      if (n.lid > 0.02) {   // a little lid line along the edge
        const edge = ey - ry + n.lid * 2 * ry, slant = s * n.lidTilt;
        g.strokeStyle = INK; g.lineWidth = 0.025 * u;
        g.beginPath(); g.moveTo(ex - rx * 1.1, edge + slant * rx * 1.1); g.lineTo(ex + rx * 1.1, edge - slant * rx * 1.1); g.stroke();
      }
    }

    // brows: short thick arches, tilted (inner ends up when sad, down when cross) and lifted
    g.strokeStyle = this.brows; g.lineWidth = 0.06 * u;
    for (const s of [1, -1]) {
      const [bx, by] = this.px(s * 0.33 * R, (0.29 + n.lift) * R);
      const half = 0.14 * u, rot = s * n.tilt;
      g.save(); g.translate(bx, by); g.rotate(-rot);
      g.beginPath(); g.moveTo(-half, 0.02 * u); g.quadraticCurveTo(0, -0.05 * u, half, 0.02 * u); g.stroke();
      g.restore();
    }

    // mouth
    const [mx, my] = this.px(0, -0.37 * R);
    const w = 0.24 * u * n.width;
    let open = n.open;
    if (talk !== null) open = Math.max(open, 0.15 + 0.6 * talk);
    const curve = n.curve * 0.13 * u;       // how far the middle of the mouth sits below its corners
    const top = () => { g.moveTo(mx - w, my - curve * 0.5); g.quadraticCurveTo(mx, my + curve * 0.9, mx + w, my - curve * 0.5); };
    if (n.wobble && talk === null) {
      g.strokeStyle = INK; g.lineWidth = 0.035 * u;
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const x = mx - w * 0.85 + (1.7 * w * i) / 16, y = my + Math.sin((i / 16) * Math.PI * 3) * 0.025 * u;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    } else if (open < 0.06) {
      g.strokeStyle = INK; g.lineWidth = 0.04 * u;
      g.beginPath(); top(); g.stroke();
    } else {
      // an open mouth: a grin has a flat top lip and a round bottom (a D on its side), a wail the
      // other way round; the bottom drops by how open it is
      const h = open * 0.3 * u, round = n.width < 0.5, ow = w * 1.15;
      const topBend = curve > 0 ? curve * 0.25 : curve * 1.8, lowBend = curve > 0 ? curve * 0.9 + h * 2 : curve * 0.2 + h * 1.2;
      const lip = () => { g.moveTo(mx - ow, my - curve * 0.5); g.quadraticCurveTo(mx, my + topBend, mx + ow, my - curve * 0.5); };
      const shape = () => {
        g.beginPath();
        if (round) g.ellipse(mx, my + h * 0.2, w, h * 0.75, 0, 0, Math.PI * 2);
        else { lip(); g.quadraticCurveTo(mx, my + lowBend, mx - ow, my - curve * 0.5); }
        g.closePath();
      };
      shape();
      g.fillStyle = MOUTH; g.fill();
      g.save();
      g.clip();
      if (n.tongue) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(mx, my + lowBend * 0.5 + h * 0.35, ow * 0.5, h * 0.5, 0, 0, Math.PI * 2); g.fill(); }
      if (n.teeth && !round) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.06 * u; g.beginPath(); lip(); g.stroke(); }
      g.restore();
      shape();
      g.strokeStyle = INK; g.lineWidth = 0.022 * u; g.stroke();
    }

    // tears run from the eyes down the cheeks
    if (n.tears) for (const s of [1, -1]) for (let i = 0; i < 2; i++) {
      const p = ((this.t * 0.9 + i * 0.5) % 1);
      const [tx, ty] = this.px(s * (0.38 + p * 0.08) * R, (-0.08 - p * 0.45) * R);
      g.fillStyle = TEAR.replace('0.95', (0.95 * (1 - p * p)).toFixed(2));
      g.beginPath(); g.moveTo(tx, ty - 0.09 * u); g.quadraticCurveTo(tx + 0.065 * u, ty + 0.015 * u, tx, ty + 0.05 * u);
      g.quadraticCurveTo(tx - 0.065 * u, ty + 0.015 * u, tx, ty - 0.09 * u); g.fill();
    }
  }
}
