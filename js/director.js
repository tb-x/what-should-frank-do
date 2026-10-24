// The director plays a story file (see PLAN.md, "Story file format"). It sets up the place, the cast
// and the props, then runs each scene's beats in order; a beat with "with": "prev" runs at the same
// time as the one before it. Every await checks a run token, so a story can be stopped at any moment.
import * as THREE from 'three';
import { PLACES } from './models/places.js';
import { CAST, makePerson } from './models/cast.js';
import { makeProp } from './models/props.js';
import { FEELINGS } from './models/person.js';
import { ACTIONS } from './anim.js';
import { CameraRig, headOf } from './camera.js';
import { Fx } from './fx.js';

const STOP = Symbol('stop');
const NEAR = 0.85;          // how far from someone a person stops when walking up to them (m)
const HAND_REACH = 1.05;    // further apart than this, a give or take walks over first (m)
const REACH_S = 0.6;        // seconds of reaching before a prop changes hands
const PICKUP_S = 0.75;      // seconds of bending down to pick a prop up
const RECORD_EVERY = 0.1;   // seconds between the snapshots that the rewind plays backwards
const NARRATOR = { who: 'narrator', pitch: 1.0, rate: 0.8 };

export class Director {
  constructor(stage, voice, ui) {
    this.stage = stage;
    this.voice = voice;
    this.ui = ui;
    this.cam = new CameraRig(stage.camera);
    this.token = 0;
    this.tweens = [];
    this.people = {};
    this.items = {};
  }

  /* ======== setting up ======== */

  load(story) {
    this.stop();
    this.story = story;
    const make = PLACES[story.place];
    if (!make) this.fail(`unknown place "${story.place}"`);
    const { stage } = this;
    stage.clear();
    const place = this.place = make();
    stage.world.add(place.object);
    stage.scene.background = new THREE.Color(place.sky);
    this.fx = new Fx();
    this.fx.attach(stage.world);
    this.tweens = [];
    this.people = {};
    for (const id of story.cast) {
      if (!CAST[id]) this.fail(`unknown person "${id}" in the cast`);
      const p = makePerson(id);
      p.object.visible = false;          // shown when a beat first places or walks them
      stage.world.add(p.object);
      this.people[id] = p;
    }
    this.items = {};
    for (const pr of story.props || []) {
      const m = this.mark(pr.at);
      this.items[pr.id] = this.putOnFloor(makeProp(pr.prop || pr.id), m.pos, pr.yaw ?? m.yaw);
      if (pr.knocked) setKnocked(this.items[pr.id], true);   // starts as a heap, to be built
    }
    this.cam.setPlace(place);
    this.cam.speaker = null;
    this.cam.crowd = () => Object.values(this.people).filter((p) => p.object.visible).map((p) => p.object);
    this.cam.shot('wide', [], true);
    this.voice.preload(storyLines(story));
    this.seen = new Set();
    this.path = [];
    this.recording = null;
    this.choicePoint = null;
  }

  fail(msg) {
    throw new Error(`Story "${this.story?.id}": ${msg}`);
  }

  /* ======== running ======== */

  async play(scene = 'start') {
    const token = ++this.token;
    window.tbxEvent?.('story-start', { story: this.story.id });
    await this.run(scene, token);
  }

  // From the end card: back to the question, exactly as it was.
  async again() {
    const cp = this.choicePoint;
    const token = ++this.token;
    this.voice.stop();
    this.restore(cp.state);
    try {
      await this.run(await this.choose(cp.beat, token), token);
    } catch (e) {
      if (e !== STOP) throw e;
    }
  }

  stop() {
    this.token++;
    this.voice.stop();
    this.ui.cancel();
    for (const p of Object.values(this.people)) p.talk(false);
  }

  async run(scene, token) {
    try {
      let next = scene;
      while (next) next = await this.runScene(next, token);
    } catch (e) {
      if (e !== STOP) throw e;
    }
  }

  check(token) {
    if (token !== this.token) throw STOP;
  }

  // Runs one scene; returns the next scene's name, or null when the story has ended.
  async runScene(name, token) {
    const beats = this.story.scenes[name];
    if (!beats) this.fail(`no scene "${name}"`);
    this.sceneName = name;
    for (let i = 0; i < beats.length;) {
      const group = [beats[i++]];
      while (i < beats.length && beats[i].with === 'prev') group.push(beats[i++]);
      const results = await Promise.all(group.map((b) => this.beat(b, token)));
      this.check(token);
      for (const r of results) {
        if (r && r.goto) return r.goto;
        if (r && r.end) { await this.finish(token); return null; }
      }
    }
    return null;
  }

  async beat(b, token) {
    switch (b.do) {
      case 'place': {
        if (b.item) { this.putOnFloor(this.detach(this.item(b.item)), this.mark(b.at).pos, this.mark(b.at).yaw); return; }
        const p = this.person(b.who), m = this.spot(b.at, p);
        p.move = null;
        p.object.position.copy(m.pos).setY(this.groundAt(m.pos));
        p.object.rotation.y = m.yaw;
        p.object.visible = true;
        if (b.act) p.play(this.action(b.act));
        if (b.feel) p.setFeel(this.feeling(b.feel));
        if (b.hold) p.hold(this.detach(this.item(b.hold)), 'R');
        return;
      }
      case 'walk': {
        const p = this.person(b.who), m = this.spot(b.to, p);
        p.object.visible = true;
        await p.walkTo(m.pos, m.yaw, b.speed || 'walk', b.pace || 1);
        return this.check(token);
      }
      case 'act':
        for (const p of this.persons(b.who)) p.play(this.action(b.anim));
        if (b.for) await this.wait(b.for, token);
        return;
      case 'face':
        for (const p of this.persons(b.who)) p.setFeel(this.feeling(b.feel));
        return;
      case 'look': {
        const at = this.whereIs(b.at);
        for (const p of this.persons(b.who)) p.turn = yawTo(p.object.position, at);
        return this.wait(0.4, token);
      }
      case 'say': return this.say(b, token);
      case 'take': return this.take(this.person(b.who), b.item, token);
      case 'give': return this.give(this.person(b.who), b.item, this.person(b.to), token);
      case 'drop': return this.drop(this.person(b.who), b.item, b.at, token);
      case 'slide': return this.slide(this.person(b.who), token);
      case 'knock': return this.knock(this.item(b.item), token);
      case 'rebuild': return this.rebuild(b.who ? this.persons(b.who) : [], this.item(b.item), token);
      case 'spill': return this.spill(this.item(b.item), token);
      case 'wipe': return this.wipe(this.person(b.who), this.item(b.item), token);
      case 'door': {
        // a door in the set (the washroom's cubicles) swings open or shut
        const d = this.place.doors?.[b.at] || this.fail(`no door "${b.at}" in the ${this.story.place}`);
        const from = d.rotation.y, to = b.open ? d.userData.open : 0;
        await this.tween(0.5, (u) => { d.rotation.y = from + (to - from) * (1 - (1 - u) * (1 - u)); });
        return this.check(token);
      }
      case 'clothes':
        // spare clothes: new colour for the trousers (or skirt)
        this.person(b.who).setPants(parseInt(String(b.pants).replace('#', ''), 16));
        return;
      case 'leave': {
        // goes out of the room (out of sight) until placed again
        const p = this.person(b.who);
        p.move = null;
        p.object.visible = false;
        return;
      }
      case 'cam':
        this.cam.shot(b.shot, this.persons(b.on || []), !!b.cut);
        if (b.s) await this.wait(b.s, token);
        return;
      case 'fx':
        if (b.type === 'rewind') return this.rewind(token);
        for (const id of [].concat(b.on || [])) this.fx.burst(b.type, this.fxPoint(id));
        return;
      case 'wait': return this.wait(b.s, token);
      case 'choice': return { goto: await this.choose(b, token) };
      case 'goto': return { goto: b.scene };
      case 'end': return { end: true };
      default: this.fail(`unknown beat "${b.do}"`);
    }
  }

  /* ======== beats that take a while ======== */

  async say(b, token) {
    const p = b.who === 'narrator' ? null : this.person(b.who);
    const name = p ? CAST[p.id].name : '';
    this.ui.caption(name, b.text);
    p?.talk(true, () => this.voice.level());
    this.cam.speaker = p;
    try {
      await this.voice.say(b.text, p ? styleFor(p) : NARRATOR);
    } finally {
      p?.talk(false);
      if (this.cam.speaker === p) this.cam.speaker = null;
    }
    this.check(token);
    this.ui.caption(null);
  }

  async take(who, itemId, token) {
    const item = this.item(itemId), h = this.holderOf(item);
    if (h) {
      if (dist(who, h.p.object.position) > HAND_REACH) await this.walkNear(who, h.p.object.position, NEAR, token);
      faceEachOther(who, h.p);
      who.play('reach');
      await this.wait(REACH_S, token);
      h.p.release(h.side);
      h.p.play('idle');
    } else {
      const at = item.getWorldPosition(new THREE.Vector3());
      if (dist(who, at) > 0.45) await this.walkNear(who, at, 0.32, token);
      who.turn = yawTo(who.object.position, at);
      who.play('pickup');
      await this.wait(PICKUP_S, token);
      item.removeFromParent();
    }
    who.hold(item, 'R');
    who.play('hold');
    await this.wait(0.3, token);
  }

  async give(who, itemId, to, token) {
    const item = this.item(itemId), h = this.holderOf(item);
    if (!h || h.p !== who) this.fail(`${who.id} can't give the ${itemId}: they aren't holding it`);
    if (dist(who, to.object.position) > HAND_REACH) await this.walkNear(who, to.object.position, NEAR, token);
    faceEachOther(who, to);
    who.play('reach');
    to.play('reach');
    await this.wait(REACH_S, token);
    who.release(h.side);
    to.hold(item, 'R');
    who.play('idle');
    to.play('hold');
    await this.wait(0.3, token);
  }

  async drop(who, itemId, at, token) {
    const item = this.item(itemId), h = this.holderOf(item);
    if (!h || h.p !== who) this.fail(`${who.id} can't drop the ${itemId}: they aren't holding it`);
    const from = item.getWorldPosition(new THREE.Vector3());
    who.release(h.side);
    const yaw = who.object.rotation.y;
    const to = at ? this.mark(at).pos.clone()
      : who.object.position.clone().add(new THREE.Vector3(Math.sin(yaw) * 0.38, 0, Math.cos(yaw) * 0.38));
    this.putOnFloor(item, from, yaw + Math.PI / 2);
    await this.tween(0.4, (u) => {
      item.position.lerpVectors(from, to, u);
      item.position.y = THREE.MathUtils.lerp(from.y, to.y, u * u) + Math.sin(u * Math.PI) * 0.08;
    });
    this.check(token);
  }

  // Down the slide: walk to the ladder, climb, sit, whoosh down the chute, hop off at the bottom.
  // Needs the place's slide marks (the playground has them).
  async slide(p, token) {
    const M = (n) => this.mark(`slide.${n}`), o = p.object;
    const ladder = M('ladder'), top = M('top').pos, chute0 = M('chuteTop').pos, chute1 = M('chuteEnd').pos, bottom = M('bottom');
    await p.walkTo(ladder.pos, ladder.yaw);
    this.check(token);
    p.sliding = true;
    const from = o.position.clone();
    p.play('tiptoe');
    await this.tween(1.3, (u) => o.position.lerpVectors(from, top, u));
    p.turn = null;
    o.rotation.y = ladder.yaw;
    p.play('sit');
    await this.tween(0.5, (u) => o.position.lerpVectors(top, chute0, u));
    p.setFeel('joy');
    await this.tween(1.0, (u) => o.position.lerpVectors(chute0, chute1, u * u));
    this.fx.burst('sparkle', chute1.clone().add(new THREE.Vector3(0, 0.4, 0)));
    p.play('jump');
    await this.tween(0.45, (u) => {
      o.position.lerpVectors(chute1, bottom.pos, u);
      o.position.y = chute1.y * (1 - u);
    });
    o.position.y = 0;
    p.sliding = false;
    p.play('idle');
    this.check(token);
  }

  // A prop made of loose pieces (the block tower) falls apart; rebuild puts it back, piece by piece.
  async knock(item, token) {
    const pieces = item.children[0].children;
    for (const c of pieces) c.userData.home ??= { pos: c.position.clone(), rot: c.rotation.clone() };
    const starts = pieces.map((c) => c.position.clone());
    this.fx.burst('bump', item.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.15, 0)));
    await this.tween(0.6, (u) => pieces.forEach((c, i) => {
      const end = scattered(c, i);
      c.position.lerpVectors(starts[i], end.pos, u);
      c.position.y = THREE.MathUtils.lerp(starts[i].y, end.pos.y, u * u) + Math.sin(u * Math.PI) * 0.06;
      c.rotation.set(end.rot.x * u, c.userData.home.rot.y + end.rot.y * u, end.rot.z * u);
    }));
    item.userData.knocked = true;
    this.check(token);
  }

  async rebuild(people, item, token) {
    const pieces = item.children[0].children;
    for (const p of people) {
      p.turn = yawTo(p.object.position, item.getWorldPosition(new THREE.Vector3()));
      p.play('play');
    }
    for (const c of [...pieces].sort((a, b) => a.userData.home.pos.y - b.userData.home.pos.y)) {
      const from = c.position.clone(), r0 = c.rotation.clone(), home = c.userData.home;
      await this.tween(0.45, (u) => {
        c.position.lerpVectors(from, home.pos, u);
        c.position.y += Math.sin(u * Math.PI) * 0.12;
        c.rotation.set(THREE.MathUtils.lerp(r0.x, home.rot.x, u), THREE.MathUtils.lerp(r0.y, home.rot.y, u), THREE.MathUtils.lerp(r0.z, home.rot.z, u));
      });
      this.check(token);
    }
    item.userData.knocked = false;
  }

  // A cup tips over and a puddle spreads; wipe cleans it up and stands the cup back up.
  async spill(item, token) {
    const puddle = this.puddle(item);
    const q0 = item.quaternion.clone(), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, item.rotation.y, 0, 'YXZ'));
    this.fx.burst('bump', item.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)));
    await this.tween(0.35, (u) => item.quaternion.slerpQuaternions(q0, q1, u));
    puddle.visible = true;
    await this.tween(0.9, (u) => puddle.scale.setScalar(0.05 + 0.95 * Math.sqrt(u)));
    item.userData.spilled = true;
    this.check(token);
  }

  async wipe(who, item, token) {
    const at = item.getWorldPosition(new THREE.Vector3());
    if (dist(who, at) > 0.9) await this.walkNear(who, at, 0.55, token);
    who.turn = yawTo(who.object.position, at);
    who.play('wipe');
    const puddle = this.puddle(item), q0 = item.quaternion.clone();
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, item.rotation.y, 0, 'YXZ'));
    await this.tween(1.6, (u) => {
      puddle.scale.setScalar(Math.max(0.001, 1 - u));
      item.quaternion.slerpQuaternions(q0, q1, Math.min(1, u * 2));
    });
    puddle.visible = false;
    item.userData.spilled = false;
    this.fx.burst('sparkle', at.add(new THREE.Vector3(0, 0.1, 0)));
    who.play('idle');
    this.check(token);
  }

  // the puddle that goes with a prop, made the first time it is needed
  puddle(item) {
    if (!item.userData.puddleMesh) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.9 }));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(0.001, 0.001, 0.001);
      m.visible = false;
      const at = item.getWorldPosition(new THREE.Vector3());
      const yaw = item.rotation.y;
      m.position.set(at.x + Math.sin(yaw) * 0.08, at.y + 0.004, at.z + Math.cos(yaw) * 0.08);
      this.stage.world.add(m);
      item.userData.puddleMesh = m;
    }
    return item.userData.puddleMesh;
  }

  async walkNear(who, target, gap, token) {
    const m = near(who.object.position, target, gap);
    await who.walkTo(m.pos, m.yaw);
    this.check(token);
  }

  /* ======== the question, the rewind, the end ======== */

  async choose(b, token) {
    this.choicePoint = { beat: b, state: this.snapshot() };
    this.recording = null;
    const opt = await this.ui.choose(b.question, b.options, this.seen);
    this.check(token);
    this.seen.add(opt.id);
    this.path.push(opt.id);
    window.tbxEvent?.('story-choice', { story: this.story.id, option: opt.id, kind: opt.kind, n: this.path.length });
    this.recording = [];
    this.recAcc = 0;
    return opt.goto;
  }

  // Plays what happened since the question backwards, fast, then puts everything back as it was.
  async rewind(token) {
    const frames = this.recording || [];
    this.recording = null;
    this.ui.caption(null);
    this.ui.rewind(true);
    for (const p of Object.values(this.people)) { p.move = null; p.talk(false); }
    const n = frames.length;
    await this.tween(THREE.MathUtils.clamp(n * 0.03, 1.2, 2.6), (u) => {
      if (!n) return;
      const f = frames[Math.round((1 - u) * (n - 1))];
      for (const [id, s] of Object.entries(f)) {
        const p = this.people[id];
        p.object.position.copy(s.pos);
        p.object.rotation.y = s.yaw;
        if (p.action !== s.action) p.play(s.action);
        if (p.feel !== s.feel) p.setFeel(s.feel);
      }
    });
    this.check(token);
    this.restore(this.choicePoint.state);
    await this.wait(0.4, token);
    this.ui.rewind(false);
  }

  async finish(token) {
    this.recording = null;
    window.tbxEvent?.('story-end', { story: this.story.id, path: this.path.join('>') });
    await this.wait(0.8, token);
    this.ui.end(this.choicePoint ? this.choicePoint.beat.options : [], this.seen);
  }

  /* ======== snapshots ======== */

  snapshot() {
    const people = {}, items = {};
    for (const [id, p] of Object.entries(this.people)) {
      people[id] = { pos: p.object.position.clone(), yaw: p.object.rotation.y, action: p.action, feel: p.feel, visible: p.object.visible, pants: p.pants ?? p.spec.pants };
    }
    for (const [id, o] of Object.entries(this.items)) {
      const h = this.holderOf(o);
      items[id] = h ? { holder: h.p.id, side: h.side } : { pos: o.position.clone(), quat: o.quaternion.clone() };
      Object.assign(items[id], { knocked: !!o.userData.knocked, spilled: !!o.userData.spilled });
    }
    const doors = Object.fromEntries(Object.entries(this.place.doors || {}).map(([id, d]) => [id, d.rotation.y]));
    return { people, items, doors, cam: { kind: this.cam.kind, on: this.cam.on.slice() } };
  }

  restore(s) {
    for (const o of Object.values(this.items)) this.detach(o);
    for (const [id, st] of Object.entries(s.people)) {
      const p = this.people[id];
      p.move = null;
      p.turn = null;
      p.talk(false);
      p.object.position.copy(st.pos);
      p.object.rotation.y = st.yaw;
      p.object.visible = st.visible;
      p.play(st.action);
      p.setFeel(st.feel);
      p.setPants(st.pants);
    }
    for (const [id, st] of Object.entries(s.items)) {
      const o = this.items[id];
      if (st.holder) this.people[st.holder].hold(o, st.side);
      else { this.putOnFloor(o, st.pos); o.quaternion.copy(st.quat); }
      setKnocked(o, st.knocked);
      if (o.userData.puddleMesh || st.spilled) {
        const pm = this.puddle(o);
        pm.visible = st.spilled;
        pm.scale.setScalar(st.spilled ? 1 : 0.001);
      }
      o.userData.spilled = st.spilled;
    }
    for (const [id, y] of Object.entries(s.doors || {})) this.place.doors[id].rotation.y = y;
    this.cam.shot(s.cam.kind, s.cam.on);
  }

  /* ======== every frame ======== */

  update(dt) {
    const onFloor = Object.values(this.people).filter((p) => p.object.visible && !p.sliding);
    steer(onFloor);
    for (const p of Object.values(this.people)) p.update(dt);
    // people stand on the ground where they are (stepping up onto the sandbox's sand)
    for (const p of onFloor) {
      const o = p.object.position;
      o.y += (this.groundAt(o) - o.y) * Math.min(1, dt * 12);
    }
    keepApart(onFloor);
    this.tweens = this.tweens.filter((tw) => {
      tw.t += dt;
      const u = Math.min(1, tw.t / tw.dur);
      tw.fn(u);
      if (u >= 1) tw.done();
      return u < 1;
    });
    this.fx?.update(dt);
    if (this.place) this.cam.update(dt);
    if (this.recording) {
      this.recAcc += dt;
      if (this.recAcc >= RECORD_EVERY) {
        this.recAcc = 0;
        const f = {};
        for (const [id, p] of Object.entries(this.people)) f[id] = { pos: p.object.position.clone(), yaw: p.object.rotation.y, action: p.action, feel: p.feel };
        this.recording.push(f);
      }
    }
  }

  // Waits run on the story's clock, so a story pauses while the page is hidden.
  tween(dur, fn) {
    return new Promise((done) => this.tweens.push({ t: 0, dur, fn, done }));
  }

  wait(s, token) {
    return this.tween(s, () => {}).then(() => this.check(token));
  }

  /* ======== looking things up ======== */

  person(id) {
    return this.people[id] || this.fail(`"${id}" is not in the cast`);
  }

  persons(ids) {
    return [].concat(ids).map((id) => this.person(id));
  }

  item(id) {
    return this.items[id] || this.fail(`no prop "${id}"`);
  }

  action(name) {
    return ACTIONS[name] ? name : this.fail(`unknown action "${name}"`);
  }

  feeling(name) {
    return FEELINGS[name] ? name : this.fail(`unknown feeling "${name}"`);
  }

  mark(name) {
    return this.place.marks[name] || this.fail(`no spot "${name}" in the ${this.story.place}`);
  }

  // A spot to stand on: a mark's name, or { "near": <person or prop> }.
  spot(to, mover) {
    if (typeof to === 'string') return this.mark(to);
    if (to && to.near) return near(mover.object.position, this.whereIs(to.near), to.gap || NEAR);
    return this.fail(`can't find the spot ${JSON.stringify(to)}`);
  }

  // Where a person, a prop or a mark is on the floor.
  whereIs(id) {
    if (this.people[id]) return this.people[id].object.position.clone();
    if (this.items[id]) return this.items[id].getWorldPosition(new THREE.Vector3()).setY(0);
    return this.mark(id).pos.clone();
  }

  fxPoint(id) {
    if (this.people[id]) return headOf(this.people[id]).add(new THREE.Vector3(0, 0.3, 0));
    return this.whereIs(id).add(new THREE.Vector3(0, 0.12, 0));
  }

  groundAt(pos) {
    return this.place?.ground ? this.place.ground(pos.x, pos.z) : 0;
  }

  holderOf(item) {
    for (const p of Object.values(this.people)) for (const side of ['L', 'R']) if (p.held[side] === item) return { p, side };
    return null;
  }

  detach(item) {
    const h = this.holderOf(item);
    if (h) h.p.release(h.side); else item.removeFromParent();
    return item;
  }

  putOnFloor(obj, pos, yaw = 0) {
    this.stage.world.add(obj);
    obj.position.copy(pos);
    obj.rotation.set(0, yaw, 0);
    return obj;
  }
}

/* ======== helpers ======== */

function yawTo(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function dist(p, at) {
  return Math.hypot(p.object.position.x - at.x, p.object.position.z - at.z);
}

function faceEachOther(a, b) {
  a.turn = yawTo(a.object.position, b.object.position);
  b.turn = yawTo(b.object.position, a.object.position);
}

/* ======== nobody walks through anybody ======== */

const LOOK_AHEAD = 1.3;     // metres ahead a walker looks for people in the way

// A walker steers sideways round anyone standing on the line ahead of them (but not round the person
// they're walking up to, who stands beyond the end of the walk).
function steer(people) {
  for (const p of people) {
    p.avoid.set(0, 0, 0);
    if (!p.move) continue;
    const pos = p.object.position, dir = p.move.to.clone().sub(pos).setY(0), left = dir.length();
    if (left < 0.05) continue;
    dir.divideScalar(left);
    for (const q of people) {
      if (q === p) continue;
      const rel = q.object.position.clone().sub(pos).setY(0), along = rel.dot(dir);
      if (along <= 0 || along > Math.min(LOOK_AHEAD, left + 0.1)) continue;
      const side = rel.clone().addScaledVector(dir, -along), off = side.length();
      const clear = p.radius + q.radius + 0.12;
      if (off >= clear) continue;
      // away from them (to the right if they're dead ahead), harder the closer they are
      const away = off > 1e-3 ? side.multiplyScalar(-1 / off) : new THREE.Vector3(-dir.z, 0, dir.x);
      p.avoid.addScaledVector(away, 1.6 * (1 - off / clear) * (1 - along / LOOK_AHEAD * 0.5));
    }
  }
}

// After moving, two people never overlap: whoever is walking gets nudged out of the other's space.
// People standing or sitting still are left where the story put them.
function keepApart(people) {
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const a = people[i], b = people[j];
    if (!a.move && !b.move) continue;
    const d = b.object.position.clone().sub(a.object.position).setY(0), dist = d.length();
    const min = a.radius + b.radius;
    if (dist >= min) continue;
    const push = d.lengthSq() > 1e-6 ? d.divideScalar(dist) : new THREE.Vector3(1, 0, 0);
    const over = min - dist;
    // a walker whose spot is taken by someone standing there stops close by instead of circling
    for (const [w, other] of [[a, b], [b, a]]) {
      if (w.move && !other.move && w.object.position.distanceTo(w.move.to) < min + 0.15) w.arrive();
    }
    if (a.move && b.move) {
      a.object.position.addScaledVector(push, -over / 2);
      b.object.position.addScaledVector(push, over / 2);
    } else if (a.move) a.object.position.addScaledVector(push, -over);
    else b.object.position.addScaledVector(push, over);
  }
}

// A spot `gap` metres from `target`, on the side `from` is coming from, facing the target.
// Where the i-th piece of a knocked-over prop lands (always the same place, so a rewind looks right).
function scattered(c, i) {
  const a = i * 2.1 + 0.4, r = 0.13 + (i % 3) * 0.07;
  return {
    pos: new THREE.Vector3(Math.cos(a) * r, c.userData.home.pos.y > 0.05 ? 0.045 : c.userData.home.pos.y, Math.sin(a) * r),
    rot: new THREE.Euler(i % 2 ? Math.PI / 2 : 0, a, i % 3 ? 0 : Math.PI / 2),
  };
}

function setKnocked(item, knocked) {
  const pieces = item.children[0] ? item.children[0].children : [];
  for (const [i, c] of pieces.entries()) {
    if (!c.userData.home) {
      if (!knocked) continue;
      c.userData.home = { pos: c.position.clone(), rot: c.rotation.clone() };
    }
    const t = knocked ? scattered(c, i) : { pos: c.userData.home.pos, rot: c.userData.home.rot };
    c.position.copy(t.pos);
    if (knocked) c.rotation.set(t.rot.x, c.userData.home.rot.y + t.rot.y, t.rot.z);
    else c.rotation.copy(t.rot);
  }
  item.userData.knocked = knocked;
}

function near(from, target, gap) {
  const d = new THREE.Vector3(from.x - target.x, 0, from.z - target.z);
  if (d.lengthSq() < 1e-4) d.set(0, 0, 1);
  d.normalize();
  const pos = new THREE.Vector3(target.x, 0, target.z).addScaledVector(d, gap);
  return { pos, yaw: yawTo(pos, target) };
}

// When there's no clip, each person speaks at their own pitch with the device voice: kids higher,
// grown-ups lower.
function styleFor(p) {
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const adult = !!p.spec.adult;
  return { who: p.id, pitch: (adult ? 1.0 : 1.45) + ((h % 5) - 2) * 0.05, rate: adult ? 0.8 : 0.85 };
}

// Every spoken line in a story as [who, text], in the same order dev/voices.py reads them.
export function storyLines(story) {
  const out = [];
  for (const beats of Object.values(story.scenes)) for (const b of beats) {
    if (b.do === 'say') out.push([b.who, b.text]);
    else if (b.do === 'choice') {
      out.push(['narrator', b.question]);
      for (const o of b.options) out.push(['narrator', o.say]);
    }
  }
  return out;
}
