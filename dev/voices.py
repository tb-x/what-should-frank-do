"""Pre-render every spoken line as an mp3 clip with Kokoro (a local, free text-to-speech model).

Kokoro-82M is Apache 2.0 (checked 2026-10-24 on huggingface.co/hexgrad/Kokoro-82M); it runs here through
kokoro-onnx (MIT). Nothing is sent anywhere. Kokoro has no child voices, so kids use women's voices
raised in pitch (and formants, which is what makes them sound small) with ffmpeg.

Setup, once (outside the game folder, nothing of it is committed):
    python -m venv ../_tools/kokoro/venv
    ../_tools/kokoro/venv/Scripts/python -m pip install kokoro-onnx soundfile imageio-ffmpeg
    download kokoro-v1.0.onnx and voices-v1.0.bin from
    github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1 into ../_tools/kokoro/models/

Use (from the what-to-do folder):
    ../_tools/kokoro/venv/Scripts/python dev/voices.py            render missing clips for every story
    ../_tools/kokoro/venv/Scripts/python dev/voices.py --force    render them all again
    ../_tools/kokoro/venv/Scripts/python dev/voices.py --audition try voices and pitches -> dev/audition/

Clips go to assets/voice/<who>-<line key>-<voice key>.mp3 and are listed in assets/voice/clips.json,
which the player reads. The line key is FNV-1a of "<who>|<text>", the same hash as js/voice.js, so a
changed line simply gets a new clip; clips no longer used by any story are deleted.
"""
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
GAME = HERE.parent
KOKORO = GAME.parent / '_tools' / 'kokoro' / 'models'
OUT = GAME / 'assets' / 'voice'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 24000

# One voice per speaker. pitch raises pitch and formants together (1.0 = as recorded). A 5-year-old
# speaks at about 250-300 Hz and Kokoro's women's voices at 150-215 Hz, so each kid's pitch is set to
# land at 250-280 Hz (measured with --audition, 2026-10-24); much above x1.4 starts to sound like a
# chipmunk. A voice can be a blend: [("af_bella", 0.75), ("am_puck", 0.25)].
VOICES = {
    'narrator': {'voice': 'af_heart', 'speed': 0.82, 'pitch': 1.0},
    'frank':    {'voice': 'af_bella', 'speed': 0.88, 'pitch': 1.28},                            # ~273 Hz
    'leo':      {'voice': 'af_sarah', 'speed': 0.88, 'pitch': 1.32},                            # ~268 Hz
    'maya':     {'voice': 'af_heart', 'speed': 0.88, 'pitch': 1.26},                            # ~279 Hz
    'zoe':      {'voice': 'af_aoede', 'speed': 0.88, 'pitch': 1.4},                             # ~250 Hz
    'sam':      {'voice': [('af_bella', 0.75), ('am_puck', 0.25)], 'speed': 0.88, 'pitch': 1.32},  # ~254 Hz
    'ola':      {'voice': [('af_heart', 0.6), ('af_nova', 0.4)], 'speed': 0.88, 'pitch': 1.32},    # ~261 Hz
    'max':      {'voice': [('af_sarah', 0.8), ('am_puck', 0.2)], 'speed': 0.88, 'pitch': 1.3},    # ~242 Hz, a bigger kid
    'msRosa':   {'voice': 'af_river', 'speed': 0.85, 'pitch': 1.0},    # American English (was bf_emma, then af_nicole)
    'mrBen':    {'voice': 'am_michael', 'speed': 0.85, 'pitch': 1.0},
}


def fnv(text):
    h = 0x811C9DC5
    for b in text.encode('utf-8'):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f'{h:08x}'


def line_key(who, text):
    return fnv(f'{who}|{text}')


# ======== the lines ========

def story_lines(story):
    for beats in story['scenes'].values():
        for b in beats:
            if b.get('do') == 'say':
                yield b['who'], b['text']
            elif b.get('do') == 'choice':
                yield 'narrator', b['question']
                for o in b['options']:
                    yield 'narrator', o['say']


def all_lines(only=None):
    index = json.loads((GAME / 'stories' / 'index.json').read_text(encoding='utf-8'))
    lines = {}
    for entry in index:
        if only and entry['id'] not in only:
            continue
        story = json.loads((GAME / 'stories' / f"{entry['id']}.json").read_text(encoding='utf-8'))
        for who, text in story_lines(story):
            lines[line_key(who, text)] = (who, text)
    for text in json.loads((GAME / 'stories' / 'shared.json').read_text(encoding='utf-8')).values():
        lines[line_key('narrator', text)] = ('narrator', text)
    return lines


# ======== rendering ========

_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        _kokoro = Kokoro(str(KOKORO / 'kokoro-v1.0.onnx'), str(KOKORO / 'voices-v1.0.bin'))
    return _kokoro


def voice_of(v):
    if isinstance(v, str):
        return v
    return sum(kokoro().get_voice_style(name) * w for name, w in v)


def ffmpeg(samples, args):
    """Pipe float samples through ffmpeg; returns its stdout."""
    cmd = [FFMPEG, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0', *args]
    return subprocess.run(cmd, input=samples.astype(np.float32).tobytes(), capture_output=True, check=True).stdout


# How slowly lines are said: speeds are in VOICES; these are the pauses Kokoro leaves between
# sentences and at commas (seconds). Slower than Kokoro's defaults (0.25, 0.1) for young listeners.
SENTENCE_PAUSE = 0.45
CLAUSE_PAUSE = 0.2

# Bump to render every clip again after changing anything below that VOICES doesn't capture.
RENDER_V = 2

# Sounds Kokoro can't read from spelling: a line starting with a key is said with these phonemes
# instead. Kokoro reads "Hmm" as "hum" and "Mmm" or "Mhm" letter by letter; written-out hums didn't
# sound natural either (tried 2026-10-24, kept in dev/audition/hmm-*.mp3), so stories avoid such sounds
# and use real words ("Let's think."). Empty for now.
SAY_PHONEMES = {}

# Captions keep the text as written; the voice gets a version that's easier to say.
SAY_AS = [(re.compile(r'\bMs\b\.?'), 'Miz'), (re.compile(r'\bMr\b\.?'), 'Mister'), (re.compile(r'\bOK\b'), 'okay')]


def speakable(text):
    for pattern, said in SAY_AS:
        text = pattern.sub(said, text)
    # words in capitals ("say STOP") might be spelled out letter by letter
    return re.sub(r'\b[A-Z]{2,}\b', lambda m: m.group(0).lower(), text)


def render(text, cfg):
    """Speak `text` with a VOICES entry; returns float samples at SR after the pitch change."""
    opts = dict(voice=voice_of(cfg['voice']), speed=cfg.get('speed', 1.0), sentence_pause=SENTENCE_PAUSE, clause_pause=CLAUSE_PAUSE)
    start = next((k for k in SAY_PHONEMES if text.startswith(k)), None)
    if start:
        rest = speakable(text[len(start):].strip())
        phonemes = SAY_PHONEMES[start] + (' ' + kokoro().tokenizer.phonemize(rest, 'en-us') if rest else '')
        samples, sr = kokoro().create(phonemes, is_phonemes=True, **opts)
    else:
        samples, sr = kokoro().create(speakable(text), lang='en-us', **opts)
    assert sr == SR
    p = cfg.get('pitch', 1.0)
    if abs(p - 1) > 1e-3:
        # asetrate raises pitch and formants by p (and speeds up); atempo puts the length back
        raw = ffmpeg(samples, ['-af', f'asetrate={SR * p:.0f},aresample={SR},atempo={1 / p:.5f}', '-f', 'f32le', 'pipe:1'])
        samples = np.frombuffer(raw, dtype=np.float32)
    pad = np.zeros(int(SR * 0.06), dtype=np.float32)
    return np.concatenate([pad, samples, pad])


def save_mp3(samples, path):
    peak = float(np.max(np.abs(samples))) or 1.0
    samples = samples * min(1.0, 0.89 / peak)          # same loudness ceiling for every clip
    ffmpeg(samples, ['-codec:a', 'libmp3lame', '-b:a', '64k', '-y', str(path)])


def median_pitch(samples):
    """Rough speaking pitch in Hz: autocorrelation over voiced 40 ms frames, median."""
    n, hop, out = int(SR * 0.04), int(SR * 0.02), []
    lo, hi = int(SR / 500), int(SR / 80)
    for i in range(0, len(samples) - n, hop):
        f = samples[i:i + n] - np.mean(samples[i:i + n])
        if np.sqrt(np.mean(f * f)) < 0.02:
            continue
        ac = np.correlate(f, f, 'full')[n - 1:]
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.45 * ac[0]:
            out.append(SR / lag)
    return float(np.median(out)) if out else 0.0


# ======== commands ========

def build(only=None, force=False):
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / 'clips.json'
    old = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    lines, manifest, made = all_lines(only), {}, 0
    if only:  # keep other stories' clips when rendering just some
        manifest = {k: v for k, v in old.items() if k not in lines}
    for key, (who, text) in lines.items():
        cfg = VOICES.get(who)
        if not cfg:
            sys.exit(f'No voice for "{who}": add it to VOICES in dev/voices.py')
        vkey = fnv(json.dumps(cfg, sort_keys=True) + str(RENDER_V))[:6]
        name = f'{who}-{key}-{vkey}.mp3'
        if not force and key in old and old[key]['file'] == name and (OUT / name).exists():
            manifest[key] = old[key]
            continue
        samples = render(text, cfg)
        save_mp3(samples, OUT / name)
        manifest[key] = {
            'file': name, 'who': who, 'text': text, 'dur': round(len(samples) / SR, 2),
            'voice': cfg['voice'] if isinstance(cfg['voice'], str) else '+'.join(f'{n}*{w}' for n, w in cfg['voice']),
            'speed': cfg.get('speed', 1.0), 'pitch': cfg.get('pitch', 1.0),
            'tool': 'Kokoro-82M v1.0 (kokoro-onnx)', 'made': datetime.date.today().isoformat(),
        }
        made += 1
        print(f'  {name}  {text}')
    used = {v['file'] for v in manifest.values()}
    removed = 0
    for f in OUT.glob('*.mp3'):
        if f.name not in used:
            f.unlink()
            removed += 1
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
    print(f'{made} new clips, {removed} old ones removed, {len(manifest)} in clips.json')


AUDITION_LINES = ['Hey! I was playing with that!', 'But I want a turn! Can I have it, please?']
AUDITION_VOICES = ['af_bella', 'af_sarah', 'af_kore', 'af_aoede', 'af_nicole', 'af_nova', 'af_sky', 'af_heart', 'am_puck']
AUDITION_PITCHES = [1.0, 1.12, 1.2, 1.28, 1.36]


def audition():
    out = HERE / 'audition'
    out.mkdir(exist_ok=True)
    rows = []
    for v in AUDITION_VOICES:
        cells = []
        for p in AUDITION_PITCHES:
            samples = np.concatenate([render(t, {'voice': v, 'pitch': p}) for t in AUDITION_LINES])
            name = f'{v}-{p:.2f}.mp3'
            save_mp3(samples, out / name)
            hz = median_pitch(samples)
            cells.append((name, hz))
            print(f'  {name}  {hz:.0f} Hz')
        rows.append((v, cells))
    cast = []
    for who, cfg in VOICES.items():
        samples = np.concatenate([render(t, cfg) for t in AUDITION_LINES])
        save_mp3(samples, out / f'cast-{who}.mp3')
        cast.append((who, cfg, median_pitch(samples)))
        print(f'  cast-{who}.mp3  {cast[-1][2]:.0f} Hz')
    castrows = ''.join(f'<tr><th>{w}</th><td><audio controls preload="none" src="cast-{w}.mp3"></audio></td><td>{c["voice"]} ×{c["pitch"]}</td><td>{hz:.0f} Hz</td></tr>' for w, c, hz in cast)
    head = ''.join(f'<th>pitch ×{p:.2f}</th>' for p in AUDITION_PITCHES)
    body = ''.join(
        f'<tr><th>{v}</th>' + ''.join(f'<td><audio controls preload="none" src="{n}"></audio><br>{hz:.0f} Hz</td>' for n, hz in cells) + '</tr>'
        for v, cells in rows)
    (out / 'index.html').write_text(f"""<!doctype html><meta charset="utf-8"><title>Voice audition</title>
<style>body{{font-family:Verdana,sans-serif;margin:16px}}td,th{{padding:6px;text-align:center;font-size:12px}}audio{{width:150px}}</style>
<h1>Kid voice audition</h1><p>Lines: "{'" / "'.join(AUDITION_LINES)}". A 5-year-old speaks at about 250-300 Hz;
women's voices sit around 180-230 Hz. Higher pitch numbers also make the voice sound smaller.</p>
<h2>The cast as set in VOICES</h2><table>{castrows}</table>
<h2>Every voice at every pitch</h2><table><tr><th></th>{head}</tr>{body}</table>""", encoding='utf-8', newline='\n')
    print(f'Listen: {out / "index.html"}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--audition' in args:
        audition()
    else:
        build([a for a in args if not a.startswith('--')] or None, force='--force' in args)
