// Everything drawn over the 3D stage: the story picker, the caption bubble, the choice screen (read
// aloud, one button at a time), the rewind and the end card. Icons are inline SVG so they look the
// same on every device (emoji don't).

const NARRATOR = { who: 'narrator', pitch: 1.0, rate: 0.8 };
const CC_KEY = 'whattodo.captions';

const INK = '#2a2140', SKIN = '#f6c49f';
const svg = (body) => `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
const truckArt = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-30" y="-6" width="40" height="20" rx="4" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
  <rect x="8" y="-16" width="22" height="30" rx="5" fill="#e8433f" stroke="${INK}" stroke-width="3"/>
  <rect x="17" y="-11" width="9" height="10" rx="2" fill="#bfe8ff"/>
  <circle cx="-18" cy="17" r="7" fill="${INK}"/><circle cx="18" cy="17" r="7" fill="${INK}"/></g>`;
const hand = (x, y) => `<g transform="translate(${x} ${y})"><circle r="11" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>
  <circle cx="-7" cy="-10" r="4.5" fill="${SKIN}" stroke="${INK}" stroke-width="2.5"/><circle cx="1" cy="-12" r="4.5" fill="${SKIN}" stroke="${INK}" stroke-width="2.5"/><circle cx="9" cy="-9" r="4.5" fill="${SKIN}" stroke="${INK}" stroke-width="2.5"/></g>`;

export const ICONS = {
  cry: svg(`<circle cx="50" cy="52" r="40" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>
    <path d="M27 44q8-7 16 0M57 44q8-7 16 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 76q14-20 28 0z" fill="#7a2433" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 50q-7 14 0 19q7-5 0-19zM70 50q-7 14 0 19q7-5 0-19z" fill="#5bc0ff"/>`),
  grab: svg(`${truckArt(50, 56, 0.85)}${hand(18, 60)}${hand(82, 60)}
    <path d="M8 34l-6-6M14 30l-3-8M86 30l3-8M92 34l6-6" stroke="#e8433f" stroke-width="4" stroke-linecap="round"/>`),
  teacher: svg(`<circle cx="50" cy="20" r="11" fill="#5a3220"/>
    <circle cx="50" cy="54" r="32" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>
    <path d="M18 52a32 32 0 0 1 64 0q-16-14-32-12q-16-2-32 12z" fill="#5a3220"/>
    <circle cx="38" cy="56" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="62" cy="56" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M46 56h8" stroke="${INK}" stroke-width="3"/><circle cx="38" cy="56" r="3" fill="${INK}"/><circle cx="62" cy="56" r="3" fill="${INK}"/>
    <path d="M38 72q12 9 24 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`),
  stop: svg(`<path d="M30 6h40l24 24v40l-24 24h-40l-24-24v-40z" fill="#e8433f" stroke="${INK}" stroke-width="4"/>
    <path d="M38 70v-30a5 5 0 0 1 10 0v-6a5 5 0 0 1 10 0v4a5 5 0 0 1 10 0v26q0 14-14 14h-6q-10 0-14-8l-8-12a5 5 0 0 1 8-6z" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`),
  share: svg(`${truckArt(50, 50, 0.9)}<path d="M20 82q30 14 60 0" fill="none" stroke="#5bd16b" stroke-width="6" stroke-linecap="round"/>
    <path d="M74 74l8 8-10 4" fill="none" stroke="#5bd16b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`),
  sulk: svg(`<circle cx="50" cy="52" r="40" fill="#9fc6ff" stroke="${INK}" stroke-width="4"/>
    <path d="M30 40l12 4M70 40l-12 4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="37" cy="52" r="4.5" fill="${INK}"/><circle cx="63" cy="52" r="4.5" fill="${INK}"/>
    <path d="M36 76q14-12 28 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`),
  shout: svg(`<circle cx="46" cy="54" r="36" fill="#ff8a5a" stroke="${INK}" stroke-width="4"/>
    <path d="M24 40l14 6M68 40l-14 6" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="46" cy="72" rx="13" ry="10" fill="#7a2433" stroke="${INK}" stroke-width="3"/>
    <path d="M86 34l10-6M88 52h11M86 70l10 6" stroke="#e8433f" stroke-width="5" stroke-linecap="round"/>`),
  ask: svg(`<path d="M14 14h72a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8h-38l-20 18v-18h-14a8 8 0 0 1-8-8v-44a8 8 0 0 1 8-8z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <text x="50" y="62" font-family="Verdana" font-weight="bold" font-size="44" text-anchor="middle" fill="#43b05c">?</text>`),
  breathe: svg(`<circle cx="42" cy="52" r="34" fill="#ffd23f" stroke="${INK}" stroke-width="4"/>
    <path d="M26 46q6-5 12 0M46 46q6-5 12 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="42" cy="68" r="6" fill="#7a2433"/>
    <path d="M58 70q12-4 22 2q-8 4-2 10M60 82q10 2 16 10" fill="none" stroke="#5bc0ff" stroke-width="5" stroke-linecap="round"/>`),
  play: svg(`<g transform="translate(50 56)"><rect x="-34" y="-12" width="68" height="22" rx="8" fill="#3fa7ff" stroke="${INK}" stroke-width="3"/>
    <rect x="-16" y="-28" width="34" height="18" rx="6" fill="#bfe8ff" stroke="${INK}" stroke-width="3"/>
    <circle cx="-20" cy="14" r="9" fill="${INK}"/><circle cx="20" cy="14" r="9" fill="${INK}"/></g>`),
  hush: svg(`<circle cx="40" cy="54" r="34" fill="#ffb37a" stroke="${INK}" stroke-width="4"/>
    <path d="M20 42l12 4M60 42l-12 4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="30" cy="54" r="4" fill="${INK}"/><circle cx="50" cy="54" r="4" fill="${INK}"/>
    <path d="M30 72h20" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M76 82v-28a5 5 0 0 1 10 0v-6a5 5 0 0 1 10 0v34q0 10-10 10h-4q-6 0-6-10z" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`),
  heart: svg(`<path d="M50 88C10 62 8 34 26 22c11-7 20-2 24 8c4-10 13-15 24-8c18 12 16 40-24 66z" fill="#ff5a8a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M30 36q4-8 12-6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
  hide: svg(`<circle cx="50" cy="44" r="30" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>
    <path d="M22 40a28 28 0 0 1 56 0q-14-10-28-8q-14-2-28 8z" fill="#8a5a2b"/>
    <circle cx="40" cy="46" r="4.5" fill="${INK}"/><circle cx="60" cy="46" r="4.5" fill="${INK}"/>
    <rect x="8" y="56" width="84" height="38" rx="6" fill="#9b6bff" stroke="${INK}" stroke-width="4"/>`),
  blame: svg(`<path d="M10 58h44a8 8 0 0 0 0-16h-8l26 0a6 6 0 0 0 0-12h-34q-14 0-20 10l-8 10z" fill="${SKIN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" transform="translate(0 14)"/>
    <circle cx="86" cy="48" r="8" fill="#e8433f"/><path d="M80 30l6 10M94 30l-6 10" stroke="#e8433f" stroke-width="4" stroke-linecap="round"/>`),
  sorry: svg(`<path d="M50 86C12 62 10 34 27 23c10-7 19-2 23 7c4-9 13-14 23-7c17 11 15 39-23 63z" fill="#ff5a8a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <g transform="rotate(-35 50 50)"><rect x="24" y="42" width="52" height="18" rx="9" fill="#ffe0b8" stroke="${INK}" stroke-width="3"/>
    <rect x="42" y="42" width="16" height="18" fill="#f5c58f"/><circle cx="46" cy="48" r="1.6" fill="${INK}"/><circle cx="54" cy="54" r="1.6" fill="${INK}"/></g>`),
  push: svg(`${hand(56, 50)}${hand(56, 76)}
    <path d="M8 63h28M26 52l12 11-12 11" fill="none" stroke="#e8433f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="76" y="30" width="16" height="58" rx="7" fill="#3fa7ff" stroke="${INK}" stroke-width="3" transform="rotate(12 84 59)"/>`),
  wait: svg(`<path d="M24 8h52M24 92h52" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 10q0 26 20 40q-20 14-20 40h40q0-26-20-40q20-14 20-40z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M38 22h24q-4 14-12 20q-8-6-12-20zM36 86q2-14 14-22q12 8 14 22z" fill="#ffd23f"/>`),
  oops: svg(`<g stroke="${INK}" stroke-width="3"><rect x="10" y="66" width="26" height="26" rx="4" fill="#e8433f"/>
    <rect x="44" y="60" width="26" height="26" rx="4" fill="#3fa7ff" transform="rotate(25 57 73)"/>
    <rect x="66" y="30" width="24" height="24" rx="4" fill="#ffd23f" transform="rotate(-30 78 42)"/>
    <rect x="22" y="22" width="22" height="22" rx="4" fill="#5bd16b" transform="rotate(40 33 33)"/></g>
    <path d="M50 18l4 10M60 14l-2 11M70 22l-6 7" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>`),
  slide: svg(`<path d="M18 92V30h18v62" fill="none" stroke="#3fa7ff" stroke-width="6" stroke-linejoin="round"/>
    <path d="M18 44h18M18 58h18M18 72h18" stroke="${INK}" stroke-width="4"/>
    <path d="M36 30q20 0 30 30t28 32" fill="none" stroke="#ff5a5a" stroke-width="12" stroke-linecap="round"/>
    <circle cx="27" cy="18" r="10" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`),
  juice: svg(`<g transform="rotate(-70 40 56)"><path d="M26 28h28l-4 50h-20z" fill="#9b6bff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g>
    <ellipse cx="66" cy="78" rx="28" ry="10" fill="#ffa94d" stroke="${INK}" stroke-width="3"/>
    <circle cx="58" cy="60" r="4" fill="#ffa94d"/><circle cx="70" cy="64" r="3" fill="#ffa94d"/>`),
  wriggle: svg(`<circle cx="50" cy="40" r="28" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>
    <path d="M36 34l8 3M64 34l-8 3" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="41" cy="42" r="4" fill="${INK}"/><circle cx="59" cy="42" r="4" fill="${INK}"/>
    <path d="M40 54q10-6 20 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M38 70l6 24M62 70l-6 24" stroke="#3c5fa8" stroke-width="12" stroke-linecap="round"/>
    <path d="M14 40q-6 8 0 16M86 40q6 8 0 16M8 34q-8 14 0 28M92 34q8 14 0 28" fill="none" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/>`),
  toilet: svg(`<rect x="22" y="10" width="44" height="30" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="44" cy="20" r="4" fill="#7fd3ff"/>
    <path d="M14 46h62q0 22-20 28l4 18h-30l4-18q-20-6-20-28z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M14 46h62" stroke="#ffd23f" stroke-width="8" stroke-linecap="round"/>
    <circle cx="86" cy="22" r="5" fill="#7fd3ff"/><circle cx="90" cy="40" r="3.5" fill="#7fd3ff"/>`),
  clothes: svg(`<path d="M24 14h52l6 78h-24l-8-50-8 50h-24z" fill="#5bd16b" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M24 26h52" stroke="${INK}" stroke-width="3"/>
    <path d="M86 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`),
  ball: svg(`<circle cx="50" cy="50" r="40" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <path d="M50 10a40 40 0 0 1 0 80z" fill="#ff5a5a"/>
    <path d="M14 34q36 12 72 0M14 66q36-12 72 0" fill="none" stroke="#3fa7ff" stroke-width="7"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="${INK}" stroke-width="4"/>`),
  hug: svg(`<circle cx="34" cy="30" r="16" fill="${SKIN}" stroke="${INK}" stroke-width="3"/><circle cx="66" cy="30" r="16" fill="#a86d48" stroke="${INK}" stroke-width="3"/>
    <path d="M16 92q0-34 18-40q18 6 18 40z" fill="#e8433f" stroke="${INK}" stroke-width="3"/><path d="M48 92q0-34 18-40q18 6 18 40z" fill="#5bd16b" stroke="${INK}" stroke-width="3"/>
    <path d="M30 66q20 12 40 0" fill="none" stroke="${SKIN}" stroke-width="7" stroke-linecap="round"/>
    <path d="M50 18c-5-8-14-2-8 4l8 7 8-7c6-6-3-12-8-4z" fill="#ff5a8a"/>`),
  dino: svg(`<path d="M18 74q-6-24 14-30q10-22 30-14q8-12 22-4q8 6 2 14l-10 4q4 18-8 30z" fill="#5bc36b" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="74" cy="24" r="3.5" fill="${INK}"/><path d="M30 74v16M48 74v16M64 72v18" stroke="#5bc36b" stroke-width="9" stroke-linecap="round"/>
    <path d="M36 40l4-8 4 8M48 34l4-8 4 8" fill="#ff9f1c" stroke="${INK}" stroke-width="2"/>`),
  tidy: svg(`<path d="M12 46h76l-8 46h-60z" fill="#3fa7ff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="24" y="22" width="22" height="22" rx="4" fill="#e8433f" stroke="${INK}" stroke-width="3" transform="rotate(-12 35 33)"/>
    <circle cx="66" cy="32" r="13" fill="#ffd23f" stroke="${INK}" stroke-width="3"/><path d="M34 64h32" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`),
  castle: svg(`<path d="M8 88h84" stroke="#e9c46a" stroke-width="8" stroke-linecap="round"/>
    <path d="M20 86v-26h60v26z" fill="#e9c46a" stroke="${INK}" stroke-width="3"/><path d="M32 60v-18h36v18" fill="#d4a94e" stroke="${INK}" stroke-width="3"/>
    <path d="M40 42v-14h20v14" fill="#e9c46a" stroke="${INK}" stroke-width="3"/><path d="M50 28v-18" stroke="${INK}" stroke-width="3"/><path d="M50 10l14 5-14 5z" fill="#e8433f"/>`),
  stories: svg(`<g fill="currentColor"><rect x="14" y="14" width="30" height="30" rx="7"/><rect x="56" y="14" width="30" height="30" rx="7"/>
    <rect x="14" y="56" width="30" height="30" rx="7"/><rect x="56" y="56" width="30" height="30" rx="7"/></g>`),
  truck: svg(truckArt(50, 52, 1.25)),
  blocks: svg(`<g stroke="${INK}" stroke-width="3" font-family="Verdana" font-weight="bold" font-size="20" text-anchor="middle">
    <rect x="16" y="62" width="30" height="30" rx="4" fill="#e8433f"/><rect x="50" y="62" width="30" height="30" rx="4" fill="#3fa7ff"/>
    <rect x="33" y="28" width="30" height="30" rx="4" fill="#ffd23f"/><rect x="40" y="2" width="24" height="24" rx="4" fill="#5bd16b" transform="rotate(12 52 14)"/></g>`),
  race: svg(`<path d="M24 8v86" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M27 10h56v38h-56z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M27 10h14v9.5h-14zM55 10h14v9.5h-14zM41 19.5h14v9.5h-14zM69 19.5h14v9.5h-14zM27 29h14v9.5h-14zM55 29h14v9.5h-14zM41 38.5h14v9.5h-14zM69 38.5h14v9.5h-14z" fill="${INK}"/>`),
  teddy: svg(`<circle cx="24" cy="26" r="13" fill="#b07a45" stroke="${INK}" stroke-width="3"/><circle cx="76" cy="26" r="13" fill="#b07a45" stroke="${INK}" stroke-width="3"/>
    <circle cx="50" cy="54" r="36" fill="#b07a45" stroke="${INK}" stroke-width="4"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#e8c49a"/>
    <circle cx="37" cy="48" r="4.5" fill="${INK}"/><circle cx="63" cy="48" r="4.5" fill="${INK}"/><circle cx="50" cy="61" r="5" fill="${INK}"/>
    <path d="M43 70q7 6 14 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`),
  again: svg(`<circle cx="50" cy="50" r="40" fill="#fff" stroke="${INK}" stroke-width="5"/><text x="50" y="68" font-family="Verdana" font-weight="bold" font-size="52" text-anchor="middle" fill="${INK}">?</text>`),
  restart: svg(`<path d="M74 34A30 30 0 1 0 80 56" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M60 30h18v-18" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`),
  soundOn: svg(`<path d="M14 38h16l22-18v60l-22-18h-16z" fill="currentColor"/><path d="M64 34q10 16 0 32M74 24q18 26 0 52" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`),
  soundOff: svg(`<path d="M14 38h16l22-18v60l-22-18h-16z" fill="currentColor"/><path d="M66 36l24 28M90 36l-24 28" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`),
  captions: svg(`<path d="M12 18h76a6 6 0 0 1 6 6v40a6 6 0 0 1-6 6h-40l-18 16v-16h-18a6 6 0 0 1-6-6v-40a6 6 0 0 1 6-6z" fill="currentColor"/><path d="M24 36h52M24 52h36" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`),
  replay: svg(`<path d="M14 38h16l22-18v60l-22-18h-16z" fill="currentColor"/><path d="M64 34q10 16 0 32" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`),
  tick: svg(`<circle cx="50" cy="50" r="44" fill="#43b05c"/><path d="M28 52l15 15 30-32" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`),
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key, v) { try { localStorage.setItem(key, v); } catch {} }

export class UI {
  constructor(voice) {
    this.voice = voice;
    this.onAgain = this.onRestart = this.onStart = this.onPicker = () => {};
    this.lines = {};                            // stories/shared.json: the end card's spoken lines
    this.captionsOn = load(CC_KEY) !== '0';

    this.capEl = document.body.appendChild(el('div', 'caption'));
    this.capEl.hidden = true;
    this.choiceEl = document.body.appendChild(el('div', 'choice'));
    this.choiceEl.hidden = true;
    this.rewindEl = document.body.appendChild(el('div', 'rewind', `<div class="tape"><span></span><span></span></div><div class="arrows">◀◀</div>`));
    this.rewindEl.hidden = true;
    this.endEl = document.body.appendChild(el('div', 'end'));
    this.endEl.hidden = true;

    // back to the stories, next to the home button (only while a story is on)
    this.backBtn = document.body.appendChild(el('button', 'round back', ICONS.stories));
    this.backBtn.setAttribute('aria-label', 'All stories');
    this.backBtn.title = 'All stories';
    this.backBtn.hidden = true;
    this.backBtn.onclick = (e) => { e.stopPropagation(); this.voice.stop(); this.onPicker(); };

    // sound and captions buttons, top right
    const corner = document.body.appendChild(el('div', 'corner'));
    this.ccBtn = corner.appendChild(el('button', 'round', ICONS.captions));
    this.ccBtn.setAttribute('aria-label', 'Words on screen');
    this.ccBtn.onclick = () => { this.captionsOn = !this.captionsOn; save(CC_KEY, this.captionsOn ? '1' : '0'); this.paintCorner(); };
    this.soundBtn = corner.appendChild(el('button', 'round'));
    this.soundBtn.setAttribute('aria-label', 'Sound');
    this.soundBtn.onclick = () => { this.voice.setMuted(!this.voice.muted); this.paintCorner(); };
    this.paintCorner();
  }

  paintCorner() {
    this.soundBtn.innerHTML = this.voice.muted ? ICONS.soundOff : ICONS.soundOn;
    this.ccBtn.classList.toggle('off', !this.captionsOn);
    if (!this.captionsOn) this.capEl.hidden = true;
  }

  /* ---------- the story picker ---------- */

  picker(stories) {
    this.cancel();
    this.backBtn.hidden = true;
    const start = document.getElementById('start');
    const cards = start.querySelector('.cards');
    cards.innerHTML = '';
    for (const s of stories) {
      const b = cards.appendChild(el('button', 'card', `${ICONS[s.icon] || ICONS.truck}<span>${s.title}</span>`));
      b.onclick = () => { start.hidden = true; this.backBtn.hidden = false; this.onStart(s.id); };
    }
    start.hidden = false;
  }

  /* ---------- caption ---------- */

  caption(who, text) {
    if (who === null || !this.captionsOn) { this.capEl.hidden = true; return; }
    this.capEl.innerHTML = (who ? `<b>${who}</b>` : '') + `<span>${text}</span>`;
    this.capEl.classList.toggle('narrator', !who);
    this.capEl.hidden = false;
  }

  /* ---------- choosing ---------- */

  // Shows the question and its options and reads them aloud; resolves with the option tapped.
  choose(question, options, seen) {
    this.cancel();
    const box = this.choiceEl;
    box.innerHTML = '';
    const q = box.appendChild(el('div', 'question', `<span>${question}</span>`));
    const again = q.appendChild(el('button', 'hear', ICONS.replay));
    again.setAttribute('aria-label', 'Hear it again');
    const row = box.appendChild(el('div', 'opts'));
    const buttons = options.map((o) => {
      const b = row.appendChild(el('button', 'opt', `<i>${ICONS[o.icon] || ''}</i><span>${o.say}</span>`));
      if (seen.has(o.id)) b.appendChild(el('em', 'seen', ICONS.tick));
      return b;
    });
    box.hidden = false;
    this.capEl.hidden = true;

    return new Promise((resolve) => {
      let picked = false, reading = 0, armed = -1;
      const read = async () => {
        const mine = ++reading;
        const live = () => !picked && mine === reading && !box.hidden;
        q.classList.add('now');
        await this.voice.say(question, NARRATOR);
        q.classList.remove('now');
        for (let i = 0; i < options.length && live(); i++) {
          buttons[i].classList.add('now');
          await this.voice.say(options[i].say, NARRATOR);
          buttons[i].classList.remove('now');
        }
      };
      // Two taps: the first lights the button up and reads it aloud again, the second picks it,
      // so a stray tap never chooses for a child who can't read the labels yet.
      buttons.forEach((b, i) => {
        b.onclick = () => {
          if (picked) return;
          if (armed !== i) {
            armed = i;
            reading++;   // stops the read-through
            buttons.forEach((x) => x.classList.remove('now', 'armed'));
            q.classList.remove('now');
            b.classList.add('armed');
            this.voice.say(options[i].say, NARRATOR);
            return;
          }
          picked = true;
          this.voice.stop();
          b.classList.remove('armed');
          b.classList.add('picked');
          setTimeout(() => { box.hidden = true; resolve(options[i]); }, 350);
        };
      });
      again.onclick = () => { armed = -1; buttons.forEach((b) => b.classList.remove('now', 'armed')); read(); };
      read();
    });
  }

  /* ---------- rewind ---------- */

  rewind(on) {
    this.rewindEl.hidden = !on;
    document.body.classList.toggle('rewinding', on);
  }

  /* ---------- the end ---------- */

  end(options, seen) {
    const box = this.endEl;
    box.innerHTML = '';
    box.appendChild(el('div', 'bigstar', '★'));
    const tried = box.appendChild(el('div', 'tried'));
    for (const o of options) {
      const t = tried.appendChild(el('div', 'mini' + (seen.has(o.id) ? ' done' : ''), ICONS[o.icon] || ''));
      if (seen.has(o.id)) t.appendChild(el('em', 'seen', ICONS.tick));
    }
    const row = box.appendChild(el('div', 'endbtns'));
    const again = row.appendChild(el('button', 'big again', ICONS.again));
    again.setAttribute('aria-label', 'Choose again');
    const restart = row.appendChild(el('button', 'big restart', ICONS.restart));
    restart.setAttribute('aria-label', 'Start again');
    again.onclick = () => { box.hidden = true; this.voice.stop(); this.onAgain(); };
    restart.onclick = () => { box.hidden = true; this.voice.stop(); this.onRestart(); };
    box.hidden = false;
    this.capEl.hidden = true;
    const allSeen = options.every((o) => seen.has(o.id));
    const line = allSeen ? this.lines.endAll : this.lines.endAgain;
    if (line) this.voice.say(line, NARRATOR);
  }

  // Hide every story screen (when a story is stopped or restarted).
  cancel() {
    this.choiceEl.hidden = this.endEl.hidden = this.rewindEl.hidden = this.capEl.hidden = true;
    document.body.classList.remove('rewinding');
  }
}
