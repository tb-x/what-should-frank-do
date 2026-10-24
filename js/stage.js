// The 3D stage: renderer, camera, lights and the world group that a story's place, people and props
// go into. Shared by the player (index.html).
import * as THREE from 'three';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9a982, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const stage = {
    renderer, scene, camera,
    world: new THREE.Group(),
    clear() {
      scene.remove(stage.world);
      stage.world = new THREE.Group();
      scene.add(stage.world);
    },
    resize() {
      const w = innerWidth, h = innerHeight;
      if (!w || !h) return;               // a hidden page can briefly measure 0 × 0
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    render() { renderer.render(scene, camera); },
  };
  scene.add(stage.world);
  addEventListener('resize', stage.resize);
  stage.resize();
  return stage;
}
