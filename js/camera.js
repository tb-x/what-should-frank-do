// Shots instead of coordinates. A shot names what to show ("wide", "group" of people, "close" on one
// face, "over" one person's shoulder at another); the rig works out where the camera goes every frame,
// so it follows people who move, fits phones held either way, and glides there smoothly.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const EASE = 2.4;          // how fast the camera glides to a new shot (higher = faster)
const DRIFT = 0.06;        // metres of slow sway so a long line never looks frozen
const SPEAKER_SWING = 0.55;   // group shots turn this far towards where the speaker is facing
const SPEAKER_FAVOUR = 0.22;  // …centre this much more on the speaker
const SPEAKER_CLOSER = 0.93;  // …and move this much closer while they talk

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.t = 0;
    this.kind = 'wide';
    this.on = [];
  }

  setPlace(place) {
    this.place = place;
  }

  // on: a list of Person objects (or one). cut: jump there instead of gliding.
  shot(kind, on = [], cut = false) {
    this.kind = kind;
    this.on = [].concat(on);
    this.flip = null;          // which side of a group to film from; chosen on the first frame
    if (cut) this.cut();
  }

  cut() {
    const g = this.goal();
    this.pos.copy(g.pos);
    this.look.copy(g.look);
    this.apply();
  }

  update(dt) {
    this.t += dt;
    this.sideCheck = (this.sideCheck || 0) - dt;
    if (this.sideCheck <= 0 && this.flip !== null && (this.kind === 'group' || this.kind === 'two')) {
      // people move: switch sides when this one gets blocked and the other is clear
      this.sideCheck = 0.5;
      const people = this.on.filter((p) => p && p.object.visible);
      if (people.length && this.blocked(this.clamp(this.group(people, this.flip, this.high))) && !this.blocked(this.clamp(this.group(people, !this.flip, this.high)))) {
        this.flip = !this.flip;
      }
    }
    const g = this.goal(), a = 1 - Math.exp(-dt * EASE);
    if (!Number.isFinite(this.pos.x + this.look.x)) { this.cut(); return; }
    this.pos.lerp(g.pos, a);
    this.look.lerp(g.look, a);
    this.apply();
  }

  apply() {
    const d = DRIFT;
    this.camera.position.copy(this.pos).add(new THREE.Vector3(Math.sin(this.t * 0.31) * d, Math.sin(this.t * 0.23) * d * 0.5, 0));
    this.camera.lookAt(this.look);
  }

  /* ---------- where each shot puts the camera ---------- */

  goal() {
    const people = this.on.filter((p) => p && p.object.visible);
    if (this.kind === 'close' && people[0]) return this.clamp(this.close(people[0]));
    if (this.kind === 'over' && people[1]) return this.clamp(this.over(people[0], people[1]));
    if ((this.kind === 'group' || this.kind === 'two') && people.length) {
      if (this.flip === null) {
        // film from the other side when a tree, shelf or someone else is in the way on this one,
        // and from higher up, over their heads, when both sides are blocked
        const b0 = this.blocked(this.clamp(this.group(people, false))), b1 = this.blocked(this.clamp(this.group(people, true)));
        this.flip = b0 && !b1;
        this.high = b0 && b1;
      }
      return this.clamp(this.group(people, this.flip, this.high));
    }
    return this.wide();
  }

  // the distance at which a w × h metre window fills the screen
  fit(w, h) {
    const c = this.camera, v = THREE.MathUtils.degToRad(c.fov) / 2, hf = Math.atan(Math.tan(v) * c.aspect);
    return Math.max(h / 2 / Math.tan(v), w / 2 / Math.tan(hf));
  }

  wide() {
    const { pos, look } = this.place.cam;
    const k = Math.max(1, 1.5 / this.camera.aspect) ** 0.9;   // framed for 3:2, back off on narrow screens
    const L = new THREE.Vector3(...look);
    return { pos: new THREE.Vector3(...pos).sub(L).multiplyScalar(k).add(L), look: L };
  }

  group(people, flip = false, high = false) {
    const heads = people.map(headOf);
    const centre = heads.reduce((s, h) => s.add(h), new THREE.Vector3()).divideScalar(heads.length);
    // look across the line between the two people furthest apart, so nobody hides behind anyone,
    // from the side that faces the open front of the set
    let a = heads[0], b = heads[0], far = 0;
    for (const p of heads) for (const q of heads) {
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d > far) { far = d; a = p; b = q; }
    }
    const dir = new THREE.Vector3(flip ? -0.5 : 0.12, 0, 1);
    if (far > 0.3) {
      dir.set(-(b.z - a.z), 0, b.x - a.x).normalize();
      if ((dir.x * 0.25 + dir.z < 0) !== flip) dir.negate();
      dir.z += 0.35;
    }
    // in a conversation, swing round a little towards the side the speaker's face points
    const sp = this.speaker && people.length > 1 && people.includes(this.speaker) ? this.speaker : null;
    if (sp) {
      const yaw = sp.object.rotation.y, face = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      if (face.dot(dir) > -0.3) dir.addScaledVector(face, SPEAKER_SWING);
    }
    dir.normalize().y = high ? 0.9 : 0.42;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(UP, dir).normalize();
    let lo = 0, hi = 0, top = 0;
    for (const h of heads) {
      const x = h.clone().sub(centre).dot(right);
      lo = Math.min(lo, x); hi = Math.max(hi, x); top = Math.max(top, h.y);
    }
    // floor to just above the tallest head, a little low in the frame to leave room for the caption
    const w = hi - lo + 1.1, h = top + 0.55;
    const look = new THREE.Vector3(centre.x + right.x * (hi + lo) / 2, Math.max(0.4, top * 0.45), centre.z + right.z * (hi + lo) / 2);
    let d = Math.max(2.0, this.fit(w, h) + 0.4);
    if (sp) {
      // and favour them: look a bit more their way, a little closer
      const head = headOf(sp);
      look.x += (head.x - look.x) * SPEAKER_FAVOUR;
      look.z += (head.z - look.z) * SPEAKER_FAVOUR;
      d *= SPEAKER_CLOSER;
    }
    return { pos: look.clone().addScaledVector(dir, d), look };
  }

  // Is anything between the camera and what it looks at: the set, or someone who isn't in the shot?
  blocked(g) {
    if (!this.place) return false;
    const to = g.pos.clone().sub(g.look), d = to.length();
    this.ray ??= new THREE.Raycaster();
    this.ray.set(g.look, to.normalize());
    this.ray.far = d;
    const inShot = new Set(this.on.map((p) => p.object));
    const others = (this.crowd ? this.crowd() : []).filter((o) => !inShot.has(o));
    return this.ray.intersectObjects([this.place.object, ...others], true).some((h) => h.distance > 0.6);
  }

  close(p) {
    const head = headOf(p);
    const yaw = p.object.rotation.y;
    // between the way the face points and the open front of the set, a little above
    const d = new THREE.Vector3(Math.sin(yaw) * 0.55, 0, Math.cos(yaw) * 0.55 + 0.45);
    if (d.z < 0.3) d.z = 0.3;
    d.normalize().y = 0.3;
    d.normalize();
    const size = p.spec.adult ? 0.95 : 0.8;
    const look = head.clone().add(new THREE.Vector3(0, -0.1, 0));
    return { pos: look.clone().addScaledVector(d, this.fit(size, size * 0.85)), look };
  }

  over(a, b) {
    const ha = headOf(a), hb = headOf(b);
    const back = ha.clone().sub(hb).setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(UP, back).normalize();
    const pos = ha.clone().addScaledVector(back, 0.9).addScaledVector(side, 0.35).add(new THREE.Vector3(0, 0.25, 0));
    return { pos, look: hb };
  }

  // keep the camera inside the set (in front of the walls)
  clamp(g) {
    const b = this.place.bounds;
    if (b) {
      g.pos.x = THREE.MathUtils.clamp(g.pos.x, b.minX, b.maxX);
      g.pos.z = THREE.MathUtils.clamp(g.pos.z, b.minZ, b.maxZ);
      g.pos.y = THREE.MathUtils.clamp(g.pos.y, 0.4, b.maxY);
    }
    return g;
  }
}

export function headOf(p) {
  const v = new THREE.Vector3(0, p.P.headY, 0);
  p.object.updateMatrixWorld(true);
  return p.neck.localToWorld(v);
}
