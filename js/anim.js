// Body actions. Each action is a function of time that returns a target pose (joint rotations in
// radians plus `bob`, how far the hips move up or down). The person blends towards the pose every
// frame, so switching actions never pops. Sides: L is the character's left (+x), R its right (-x).
// Shoulders: x < 0 swings the arm forward, z swings it out (L: +, R: -). Elbows and knees bend on x
// (elbow forward: -, knee back: +); elbows and hips turn on y after bending (rotation order YXZ).

export function restPose() {
  return {
    torso: [0, 0, 0], neck: [0, 0, 0],
    shoulderL: [0, 0, 0.1], shoulderR: [0, 0, -0.1], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0],
    hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0],
    bob: 0,
  };
}

const sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max;

function walkCycle(p, t, f, amp, lean, armAmp, elbow) {
  const ph = t * f;
  const a = amp * sin(ph);
  p.hipL[0] = -a; p.hipR[0] = a;
  p.kneeL[0] = amp * 1.3 * max(0, -cos(ph)); p.kneeR[0] = amp * 1.3 * max(0, cos(ph));
  p.shoulderL[0] = a * armAmp; p.shoulderR[0] = -a * armAmp;
  p.elbowL[0] = p.elbowR[0] = elbow;
  p.torso = [lean, 0.08 * sin(ph), 0];
  p.bob = 0.022 * abs(cos(ph));
}

// Sitting on the floor: bottom on the floor, thighs tipped slightly up, shins back down to the floor
// so the heels rest on it (the person also lifts itself if a foot would still go below the floor).
function sitFloor(p, P) {
  p.bob = -(P.hipY - 0.075);
  p.hipL = [-1.75, 0.35, 0]; p.hipR = [-1.75, -0.35, 0];
  p.kneeL[0] = p.kneeR[0] = 0.35;
}

export const ACTIONS = {
  idle(p, t) {
    p.torso[0] = 0.02 * sin(t * 2);
    p.neck = [0.03 * sin(t * 0.7), 0.18 * sin(t * 0.4), 0];
    p.shoulderL[2] = 0.1 + 0.02 * sin(t * 2); p.shoulderR[2] = -p.shoulderL[2];
  },
  walk(p, t) { walkCycle(p, t, 7.5, 0.5, 0.05, 0.8, -0.3); },
  run(p, t) { walkCycle(p, t, 11, 0.85, 0.28, 1.0, -1.3); p.bob = 0.06 * abs(cos(t * 11)); },
  tiptoe(p, t) { walkCycle(p, t, 5, 0.3, 0.12, 0.2, -1.2); p.shoulderL[2] = 0.5; p.shoulderR[2] = -0.5; p.bob += 0.03; },
  wave(p, t) {
    ACTIONS.idle(p, t);
    p.shoulderR = [0, 0, -2.6];
    p.elbowR = [0, 0, -0.25 + 0.45 * sin(t * 9)];
    p.neck[2] = 0.12;
  },
  cry(p, t) {
    const sob = max(0, sin(t * 3)) * sin(t * 18) * 0.05;
    p.neck = [0.4 + sob, 0.12 * sin(t * 1.3), 0];
    p.torso = [0.15 + sob, 0, 0];
    p.shoulderL = [-1.05, 0, -0.25]; p.shoulderR = [-1.05, 0, 0.25];
    p.elbowL = [-1.9, -0.4, 0]; p.elbowR = [-1.9, 0.4, 0];
    p.kneeL[0] = p.kneeR[0] = 0.1;
    p.bob = -0.01 + sob * 0.2;
  },
  crySit(p, t, P) {
    ACTIONS.cry(p, t);
    sitFloor(p, P);
  },
  angry(p, t) {
    p.shoulderL = [-0.55, 0, -0.15]; p.shoulderR = [-0.6, 0, 0.15];
    p.elbowL = [-1.7, -1.25, 0]; p.elbowR = [-1.6, 1.25, 0];
    const stomp = max(0, sin(t * 6));
    p.hipR[0] = -0.45 * stomp; p.kneeR[0] = 0.7 * stomp;
    p.neck = [-0.05, 0.3 * sin(t * 1.5), 0];
    p.torso = [-0.05, 0, 0];
  },
  jump(p, t) {
    const h = abs(sin(t * 5));
    p.bob = 0.16 * h;
    p.shoulderL = [0, 0, 2.5 + 0.2 * h]; p.shoulderR = [0, 0, -2.5 - 0.2 * h];
    p.elbowL[0] = p.elbowR[0] = -0.2;
    p.kneeL[0] = p.kneeR[0] = 0.5 * (1 - h);
    p.hipL[0] = p.hipR[0] = -0.25 * (1 - h);
  },
  clap(p, t) {
    ACTIONS.idle(p, t);
    const c = 0.25 * (1 + sin(t * 12));
    p.shoulderL = [-1.1, 0, -0.1 + c]; p.shoulderR = [-1.1, 0, 0.1 - c];
    p.elbowL = [-0.7, -0.3, 0]; p.elbowR = [-0.7, 0.3, 0];
  },
  reach(p, t) {
    p.torso = [0.2, 0, 0];
    p.shoulderR = [-1.5 + 0.05 * sin(t * 4), 0, 0.05];
    p.elbowR = [-0.05, 0, 0];
    p.hipR[0] = -0.3; p.kneeR[0] = 0.3;
  },
  pickup(p, t, P) {
    p.torso = [0.65, 0, 0];
    p.neck[0] = 0.2;
    p.hipL[0] = p.hipR[0] = -0.7; p.kneeL[0] = p.kneeR[0] = 1.2;
    p.bob = -P.hipY * 0.22;
    p.shoulderR = [-0.9, 0, 0.1]; p.shoulderL = [-0.6, 0, 0.2];
    p.elbowR[0] = p.elbowL[0] = -0.1;
  },
  point(p, t) {
    ACTIONS.idle(p, t);
    p.shoulderR = [-1.45, 0.0, -0.3];
    p.elbowR = [0, 0, 0];
    p.neck[1] = -0.25;
  },
  stop(p, t) {
    // a flat hand held out: "Stop!"
    p.shoulderR = [-1.3, 0, 0.1];
    p.elbowR = [-0.9, 0, 0];
    p.torso = [-0.06, 0, 0];
    p.neck = [-0.08, 0, 0];
    p.hipL[0] = -0.15; p.hipR[0] = 0.1;
  },
  hold(p, t) {
    ACTIONS.idle(p, t);
    p.shoulderR = [-0.45, 0, 0.12]; p.elbowR = [-1.15, 0.2, 0];
    p.shoulderL = [-0.45, 0, -0.12]; p.elbowL = [-1.15, -0.2, 0];
  },
  breathe(p, t) {
    // a big, slow breath: in for two seconds, out for two
    const b = 0.5 - 0.5 * cos((t * Math.PI) / 2);
    p.torso = [-0.08 * b, 0, 0];
    p.neck = [-0.15 * b, 0, 0];
    p.shoulderL = [-0.2 * b, 0, 0.1 + 0.35 * b]; p.shoulderR = [-0.2 * b, 0, -0.1 - 0.35 * b];
    p.elbowL[0] = p.elbowR[0] = -0.15 - 0.3 * b;
    p.bob = 0.012 * b;
  },
  wipe(p, t) {
    // bent over, one hand sweeping side to side
    p.torso = [0.45, 0, 0];
    p.neck[0] = 0.3;
    p.hipL[0] = p.hipR[0] = -0.35; p.kneeL[0] = p.kneeR[0] = 0.6;
    p.shoulderR = [-1.0, 0.0, 0.15 + 0.35 * sin(t * 7)];
    p.elbowR[0] = -0.3;
    p.shoulderL = [-0.4, 0, 0.3];
    p.bob = -0.04;
  },
  wriggle(p, t) {
    // needing a wee: knees together, hopping from foot to foot, hands held low in front
    const s = sin(t * 7);
    p.hipL = [-0.25 * max(0, s), -0.15, 0]; p.hipR = [-0.25 * max(0, -s), 0.15, 0];
    p.kneeL[0] = 0.15 + 0.4 * max(0, s); p.kneeR[0] = 0.15 + 0.4 * max(0, -s);
    p.shoulderL = [-0.35, 0, -0.12]; p.shoulderR = [-0.35, 0, 0.12];
    p.elbowL = [-0.6, -0.3, 0]; p.elbowR = [-0.6, 0.3, 0];
    p.torso = [0.08, 0, 0.06 * s];
    p.neck = [0.1, 0.15 * sin(t * 2.3), 0];
    p.bob = 0.015 * abs(s);
  },
  wash(p, t) {
    // at the sink, rubbing hands together
    const r = sin(t * 9);
    p.torso = [0.15, 0, 0];
    p.neck[0] = 0.3;
    p.shoulderL = [-0.95, 0, -0.18 + 0.07 * r]; p.shoulderR = [-0.95, 0, 0.18 + 0.07 * r];
    p.elbowL = [-0.55, -0.35, 0]; p.elbowR = [-0.55, 0.35, 0];
  },
  ears(p, t) {
    // hands over the ears
    // upper arms out and up, forearms folded back in so the hands land on the ears
    p.shoulderL = [-0.1, 0, 2.0]; p.shoulderR = [-0.1, 0, -2.0];
    p.elbowL = [0, 0, 1.67]; p.elbowR = [0, 0, -1.67];
    p.neck = [0.05, 0.12 * sin(t * 3), 0];
    p.kneeL[0] = p.kneeR[0] = 0.12;
    p.bob = -0.01;
  },
  hug(p, t) {
    p.shoulderL = [-1.35, 0, 0.35]; p.shoulderR = [-1.35, 0, -0.35];
    p.elbowL = [-0.6, -0.8, 0]; p.elbowR = [-0.6, 0.8, 0];
    p.torso = [0.08, 0.1 * sin(t * 2), 0];
    p.neck[2] = 0.2;
  },
  talk(p, t) {
    ACTIONS.idle(p, t);
    const g = sin(t * 2.3);
    p.shoulderR = [-0.6 - 0.25 * g, 0, -0.25]; p.elbowR = [-1.0 + 0.3 * g, 0.4, 0];
    p.neck[0] = 0.05 * sin(t * 5);
  },
  sit(p, t, P) {
    sitFloor(p, P);
    p.neck = [0.05, 0.15 * sin(t * 0.5), 0];
    p.shoulderL[2] = 0.25; p.shoulderR[2] = -0.25;
    p.elbowL[0] = p.elbowR[0] = -0.4;
  },
  play(p, t, P) {
    sitFloor(p, P);
    p.torso[0] = 0.25;
    p.neck = [0.35, 0.1 * sin(t * 0.8), 0];
    p.shoulderL = [-0.9 + 0.2 * sin(t * 4), 0, 0.1]; p.shoulderR = [-0.9 - 0.2 * sin(t * 4), 0, -0.1];
    p.elbowL[0] = p.elbowR[0] = -0.5;
  },
  sitChair(p, t, P) {
    p.bob = P.seat + P.legR - P.hipY;
    p.hipL[0] = p.hipR[0] = -1.57;
    p.kneeL[0] = p.kneeR[0] = 1.45;
    p.shoulderL = [-0.4, 0, 0.1]; p.shoulderR = [-0.4, 0, -0.1];
    p.elbowL[0] = p.elbowR[0] = -0.8;
    p.neck = [0.1, 0.12 * sin(t * 0.5), 0];
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS);
