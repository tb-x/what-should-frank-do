// Spoken lines. A line plays its recorded clip when assets/voice/clips.json lists one (rendered by
// dev/voices.py), otherwise the device voice (speechSynthesis) at the speaker's pitch. Clips play
// through Web Audio, so the speaker's mouth can follow the loudness. When the sound is off, or in a
// test run, lines still take as long as they would to say, so the story keeps its pace.

const MUTE_KEY = 'whattodo.mute';
const WORD_S = 0.36;          // rough seconds per word for the device voice, used when silent
const CLIP_VOL = 1.0;         // 0 to 1, loudness of the recorded voices
const CLIPS = 'assets/voice/';

function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key, v) { try { localStorage.setItem(key, v); } catch {} }

// FNV-1a of "<who>|<text>": the same key dev/voices.py gives each clip
export function lineKey(who, text) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(`${who}|${text}`)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export class Voice {
  constructor({ silent = false } = {}) {
    this.silent = silent;                       // test runs never make a sound
    this.muted = silent || load(MUTE_KEY) === '1';
    this.synth = 'speechSynthesis' in window ? speechSynthesis : null;
    this.voice = null;
    this.finish = null;
    this.clips = {};                            // line key -> { file, dur }
    this.buffers = new Map();                   // file -> Promise<AudioBuffer | null>
    this.ctx = null;
    this.playing = null;
    this.sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));   // the player swaps in the story clock
    if (this.synth) {
      this.pickVoice();
      this.synth.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  pickVoice() {
    const all = this.synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    const nice = /(female|samantha|karen|serena|moira|tessa|libby|sonia|jenny|aria|zira|google uk english female)/i;
    this.voice = all.find((v) => nice.test(v.name) && /GB/i.test(v.lang)) || all.find((v) => nice.test(v.name)) || all.find((v) => /GB/i.test(v.lang)) || all[0] || null;
  }

  /* ---------- recorded clips ---------- */

  async loadClips() {
    try {
      const r = await fetch(CLIPS + 'clips.json', { cache: 'no-cache' });
      if (r.ok) this.clips = await r.json();
    } catch {}
  }

  audio() {
    if (!this.ctx && !this.silent) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = CLIP_VOL;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.gain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.wave = new Float32Array(this.analyser.fftSize);
      }
    }
    return this.ctx;
  }

  buffer(file) {
    if (!this.buffers.has(file)) {
      const ctx = this.audio();
      this.buffers.set(file, !ctx ? Promise.resolve(null) : fetch(CLIPS + file)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
        .catch(() => null));
    }
    return this.buffers.get(file);
  }

  // Start fetching a story's clips so the first line doesn't wait. lines: [[who, text], …]
  preload(lines) {
    if (this.silent) return;
    for (const [who, text] of lines) {
      const c = this.clips[lineKey(who, text)];
      if (c) this.buffer(c.file);
    }
  }

  // How loud the clip playing now is, 0 to about 1 (null when no clip is playing).
  level() {
    if (!this.playing || !this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.wave);
    let sum = 0;
    for (const v of this.wave) sum += v * v;
    return Math.min(1, Math.sqrt(sum / this.wave.length) * 5);
  }

  /* ---------- speaking ---------- */

  // Call from a tap: iOS only lets sound start after the user has touched the page.
  unlock() {
    if (this.silent) return;
    const ctx = this.audio();
    if (ctx) {
      ctx.resume?.();
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, 22050);
      s.connect(ctx.destination);
      s.start(0);
    }
    if (this.synth) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      this.synth.speak(u);
    }
  }

  setMuted(m) {
    if (this.silent) return;
    this.muted = m;
    save(MUTE_KEY, m ? '1' : '0');
    if (m) this.stop();
  }

  estimate(text, rate = 1) {
    return (text.split(/\s+/).length * WORD_S + 0.4) / rate;
  }

  // Say a line; style = { who, pitch, rate }. Resolves when it has been said (or stop() is called).
  say(text, style = {}) {
    this.stop();
    const rate = style.rate || 0.9;
    const clip = this.clips[lineKey(style.who || 'narrator', text)];
    const est = clip ? clip.dur : this.estimate(text, rate);
    return new Promise((resolve) => {
      let done = false, timer = 0;
      const fin = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (this.playing) { try { this.playing.stop(); } catch {} this.playing = null; }
        if (this.finish === fin) this.finish = null;
        resolve();
      };
      this.finish = fin;
      if (this.muted) { this.sleep(est).then(fin); return; }
      if (clip && this.audio()) {
        this.buffer(clip.file).then((buf) => {
          if (done) return;
          if (!buf) { this.speak(text, style, rate, est, fin); return; }
          this.ctx.resume?.();
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.connect(this.gain);
          src.onended = () => { if (this.playing === src) this.playing = null; fin(); };
          this.playing = src;
          src.start();
          timer = setTimeout(fin, (buf.duration + 2) * 1000);   // in case onended never comes
        });
        return;
      }
      this.speak(text, style, rate, est, fin);
    });
  }

  // the device voice
  speak(text, style, rate, est, fin) {
    if (!this.synth) { this.sleep(est).then(fin); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice ? this.voice.lang : 'en-GB';
    u.pitch = style.pitch || 1;
    u.rate = rate;
    u.onend = u.onerror = fin;
    setTimeout(fin, est * 2500 + 2000);   // some browsers never fire onend
    this.synth.speak(u);
  }

  stop() {
    if (this.synth && !this.muted) this.synth.cancel();
    this.finish?.();
  }
}
