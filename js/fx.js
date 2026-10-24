// Little effects in the 3D scene: bursts of stars, hearts and sparkles over someone's head, and a puff
// of dust when something falls. (The rewind effect is the director's: it plays time backwards.)
import * as THREE from 'three';

const KINDS = {
  stars:   { n: 10, colour: '#ffcf33', shape: 'star',  speed: 1.1, life: 1.6, size: 0.14 },
  hearts:  { n: 7,  colour: '#ff5a8a', shape: 'heart', speed: 0.8, life: 1.8, size: 0.13 },
  sparkle: { n: 12, colour: '#ffffff', shape: 'spark', speed: 1.3, life: 1.0, size: 0.1 },
  bump:    { n: 9,  colour: '#d9c9b0', shape: 'puff',  speed: 0.7, life: 0.8, size: 0.12, low: true },
  splash:  { n: 12, colour: '#7fd3ff', shape: 'puff',  speed: 0.9, life: 0.9, size: 0.07 },
};

const textures = {};
function texture(shape, colour) {
  const key = shape + colour;
  if (textures[key]) return textures[key];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = colour;
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = 3;
  g.beginPath();
  if (shape === 'star' || shape === 'spark') {
    const points = shape === 'star' ? 5 : 4, inner = shape === 'star' ? 0.45 : 0.25;
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / points, r = (i % 2 ? inner : 1) * 28;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
  } else if (shape === 'heart') {
    g.moveTo(32, 54);
    g.bezierCurveTo(4, 34, 10, 8, 32, 22);
    g.bezierCurveTo(54, 8, 60, 34, 32, 54);
  } else {
    g.arc(32, 32, 24, 0, Math.PI * 2);
  }
  g.closePath();
  g.fill();
  if (shape !== 'puff') g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (textures[key] = t);
}

export class Fx {
  constructor() {
    this.parts = [];
    this.root = new THREE.Group();
  }

  // The scene graph to add (re-added after the stage is cleared).
  attach(world) {
    world.add(this.root);
  }

  burst(type, at) {
    const k = KINDS[type];
    if (!k) return;
    for (let i = 0; i < k.n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(k.shape, k.colour), transparent: true, depthWrite: false }));
      const a = (i / k.n) * Math.PI * 2 + Math.random() * 0.4;
      s.position.copy(at);
      s.scale.setScalar(k.size);
      const out = k.low ? 1 : 0.5;
      this.parts.push({
        s, life: k.life * (0.8 + Math.random() * 0.4), age: 0, size: k.size,
        v: new THREE.Vector3(Math.cos(a) * k.speed * out, k.low ? 0.25 : k.speed * (0.8 + Math.random() * 0.6), Math.sin(a) * k.speed * out),
        spin: (Math.random() - 0.5) * 4,
      });
      this.root.add(s);
    }
  }

  update(dt) {
    this.parts = this.parts.filter((p) => {
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) { p.s.removeFromParent(); p.s.material.dispose(); return false; }
      p.v.y -= dt * 0.9;
      p.v.multiplyScalar(1 - dt * 1.2);
      p.s.position.addScaledVector(p.v, dt);
      p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      p.s.scale.setScalar(p.size * (u < 0.15 ? u / 0.15 : 1));
      return true;
    });
  }
}
