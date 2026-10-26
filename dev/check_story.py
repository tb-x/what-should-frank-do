"""Check story files against what the engine can show, and print them for a parent to read.

    python dev/check_story.py                  check every story in stories/index.json
    python dev/check_story.py left-out         check one (or a few)
    python dev/check_story.py --catalogue      print everything a story may use (cast, places and spots,
                                               props, actions, feelings, shots, effects, icons, beats)
    python dev/check_story.py --script left-out  print a story as a script, path by path, with timings

The catalogue is read straight from the code (js/…), so it can't go out of date. Errors make the
story unplayable or break the content rules in PLAN.md; warnings are worth a look. Exit code 1 on errors.
"""
import json
import re
import sys
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
JS = GAME / 'js'

WORD_S = 0.36             # seconds per word when a line has no clip (as js/voice.js)
WALK_S = 2.0              # rough seconds for a walk, give, take, slide…
MAX_WORDS = 14            # a spoken line longer than this is an error; over 12 a warning
MAX_LABEL_WORDS = 5       # a choice button's label
PATH_S = (35, 130)        # a path (start to the end card) should take this long, in seconds
SHOTS = {'wide', 'group', 'two', 'close', 'over'}
SPEEDS = {'walk', 'run', 'tiptoe'}
NOT_GOOD = {'feeling', 'hurtful', 'avoid'}   # one good choice plus two different ones of these
UPSET = {'sad', 'angry', 'cry'}
# Words a story must not use: British English (the app speaks American English) and words too hard for
# a 5-year-old. word -> what to say instead.
NOT_THESE = {
    'wee': 'pee', 'mum': 'Mom', 'mummy': 'Mom', 'trousers': 'pants', 'cross': 'mad', 'tidy': 'clean up',
    'tidying': 'cleaning up', 'tidied': 'cleaned up', 'sulk': 'go away sad', 'toilets': 'the bathroom',
    'rubbish': 'trash', 'jumper': 'sweater', 'nappy': 'diaper', 'colour': 'color', 'favourite': 'favorite',
    'flump': 'oops / plop', 'squashed': 'squeezed', 'home time': 'pick-up time', 'queue': 'line',
    'brilliant': 'great', 'lovely': 'nice', 'shan\'t': 'won\'t',
}    # worried can be empathy, which needs no calming down

BEATS = {   # beat: (required fields, optional fields)
    'place': ({'at'}, {'who', 'item', 'act', 'feel', 'hold', 'with'}),
    'walk': ({'who', 'to'}, {'speed', 'pace', 'with'}),
    'act': ({'who', 'anim'}, {'for', 'with'}),
    'face': ({'who', 'feel'}, {'with'}),
    'look': ({'who', 'at'}, {'with'}),
    'say': ({'who', 'text'}, {'with', 'id'}),
    'take': ({'who', 'item'}, {'with'}),
    'give': ({'who', 'item', 'to'}, {'with'}),
    'drop': ({'who', 'item'}, {'at', 'with'}),
    'slide': ({'who'}, {'with'}),
    'knock': ({'item'}, {'with'}),
    'rebuild': ({'item'}, {'who', 'with'}),
    'spill': ({'item'}, {'with'}),
    'wipe': ({'who', 'item'}, {'with'}),
    'door': ({'at', 'open'}, {'with'}),
    'clothes': ({'who', 'pants'}, {'with'}),
    'leave': ({'who'}, {'with'}),
    'cam': ({'shot'}, {'on', 'cut', 's', 'with'}),
    'fx': ({'type'}, {'on', 'with'}),
    'wait': ({'s'}, {'with'}),
    'choice': ({'question', 'options'}, set()),
    'goto': ({'scene'}, set()),
    'end': (set(), set()),
}


# ======== the catalogue, read from the code ========

def read(path):
    return (JS / path).read_text(encoding='utf-8')


def block(src, start):
    """The text of the {…} block that opens at the first '{' after `start`."""
    i = src.index('{', src.index(start))
    depth = 0
    for j in range(i, len(src)):
        depth += {'{': 1, '}': -1}.get(src[j], 0)
        if depth == 0:
            return src[i:j + 1]
    raise ValueError(start)


def place_marks(src, fn):
    body = block(src, f'export function {fn}(')
    marks = set(re.findall(r"^\s*'?([\w.]+)'?:\s*(?:mark|onSlide)\(", body, re.M))
    for m in re.finditer(r'`([\w.]+)\.\$\{i \+ 1\}`', body):
        before = body[:m.start()]
        loop = list(re.finditer(r'i < (\d+); i\+\+|\[([^\[\]]*)\]\.forEach\(\(\w+, i\)', before))
        if loop:
            n = int(loop[-1].group(1)) if loop[-1].group(1) else len(loop[-1].group(2).split(','))
            marks |= {f'{m.group(1)}.{k}' for k in range(1, n + 1)}
    tables = re.search(r'const tables = \[(.*?)\];', body)
    if tables:
        n = tables.group(1).count('[')
        for t in range(1, n + 1):
            marks |= {f'table.{t}', f'table.{t}.top'} | {f'table.{t}.seat{k}' for k in range(1, 5)} | {f'table.{t}.place{k}' for k in range(1, 5)}
    return sorted(marks)


def catalogue():
    cast_src = read('models/cast.js')
    cast = {}
    for m in re.finditer(r"^  (\w+): \{\n\s+name: '([^']+)'(.*?)\n  \},", cast_src, re.M | re.S):
        cast[m.group(1)] = {'name': m.group(2), 'adult': 'adult: true' in m.group(3)}
    places_src = read('models/places.js')
    places = {name: place_marks(places_src, fn) for name, fn in re.findall(r'(\w+): (make\w+)', block(places_src, 'export const PLACES'))}
    props = {m.group(1): {'name': m.group(2), 'hold': m.group(3) == 'true'}
             for m in re.finditer(r"^  (\w+):\s+\{ name: '([^']+)',\s+icon: '[^']*',\s+hold: (true|false)", read('models/props.js'), re.M)}
    actions = re.findall(r'^  (\w+)\(p, t', block(read('anim.js'), 'export const ACTIONS'), re.M)
    feelings = re.findall(r'^  (\w+):\s+\{ mouth:', read('models/person.js'), re.M)
    fx = re.findall(r'^  (\w+):\s+\{ n:', read('fx.js'), re.M) + ['rewind']
    icons = re.findall(r'^  (\w+): svg\(', read('ui.js'), re.M)
    voices_src = (GAME / 'dev' / 'voices.py').read_text(encoding='utf-8')
    voiced = re.findall(r"^    '(\w+)':\s+\{'voice'", voices_src, re.M)
    return {'cast': cast, 'places': places, 'props': props, 'actions': actions, 'feelings': feelings,
            'fx': fx, 'icons': icons, 'voiced': voiced}


def print_catalogue(cat):
    print('# What a story can use (read from the code)\n')
    print('## Cast (ids for "who")')
    for k, v in cat['cast'].items():
        print(f"- `{k}`: {v['name']}{' (grown-up)' if v['adult'] else ''}{'' if k in cat['voiced'] else ' (no voice yet: add to dev/voices.py VOICES)'}")
    print('- `narrator`: only for `say`')
    for place, marks in cat['places'].items():
        print(f'\n## Place `{place}`: spots (marks)')
        print(', '.join(f'`{m}`' for m in marks))
    print('\n## Props')
    for k, v in cat['props'].items():
        print(f"- `{k}`: {v['name']}{'' if v['hold'] else ' (can not be carried)'}")
    print('\n## Actions (`act` anim)\n' + ', '.join(f'`{a}`' for a in cat['actions']))
    print('\n## Feelings (`face` feel)\n' + ', '.join(f'`{f}`' for f in cat['feelings']))
    print('\n## Camera shots\n' + ', '.join(f'`{s}`' for s in sorted(SHOTS)))
    print('\n## Effects (`fx` type)\n' + ', '.join(f'`{f}`' for f in cat['fx']))
    print('\n## Icons (story card and choice buttons)\n' + ', '.join(f'`{i}`' for i in cat['icons']))
    print('\n## Beats')
    for b, (req, opt) in BEATS.items():
        print(f"- `{b}`: needs {', '.join(sorted(req)) or 'nothing'}; may have {', '.join(sorted(opt)) or 'nothing'}")
    print('\nChoice kinds: one `good`, and two different of `feeling`, `hurtful`, `avoid` (avoid only when the problem has no natural hurtful impulse).')
    print('\nSpecial beats: `door` (washroom: `at` a cubicle, `open` true/false), `clothes` (`pants` "#rrggbb": spare clothes), '
          '`leave` (out of the room until placed again), `slide` (playground: walks to the ladder, climbs, slides down to `slide.bottom`), '
          '`knock`/`rebuild` (a prop made of pieces, like `blocks`, falls apart / is built again; rebuild `who` play at it), '
          '`spill`/`wipe` (a cup tips over and leaves a puddle / someone wipes it up and stands it up). '
          '`walk` `to` may be `{"near": <person or prop>, "gap": metres}`.')


# ======== checking one story ========

class Report:
    def __init__(self, sid):
        self.sid, self.errors, self.warnings = sid, [], []

    def error(self, where, msg):
        self.errors.append(f'{where}: {msg}')

    def warn(self, where, msg):
        self.warnings.append(f'{where}: {msg}')


def clips():
    p = GAME / 'assets' / 'voice' / 'clips.json'
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}


def fnv(text):
    h = 0x811C9DC5
    for b in text.encode('utf-8'):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f'{h:08x}'


def words(text):
    return len(re.findall(r"\w[\w']*", text))


def check(story, cat, file_id):
    r = Report(story.get('id', file_id))
    for f in ['id', 'title', 'icon', 'prompt', 'lesson', 'place', 'cast', 'props', 'scenes']:
        if f not in story:
            r.error('story', f'missing "{f}"')
    if r.errors:
        return r
    if story['id'] != file_id:
        r.error('story', f'id "{story["id"]}" does not match the file name "{file_id}.json"')
    if story['icon'] not in cat['icons']:
        r.error('story', f'unknown icon "{story["icon"]}"')
    place = story['place']
    marks = set(cat['places'].get(place, []))
    if place not in cat['places']:
        r.error('story', f'unknown place "{place}"')
    cast = story['cast']
    for who in cast:
        if who not in cat['cast']:
            r.error('cast', f'unknown person "{who}"')
    props = {p['id']: p for p in story['props']}
    for p in story['props']:
        kind = p.get('prop', p['id'])
        if kind not in cat['props']:
            r.error('props', f'unknown prop "{kind}"')
        if p.get('at') not in marks:
            r.error('props', f'"{p["id"]}" is on unknown spot "{p.get("at")}"')
    scenes = story['scenes']
    if 'start' not in scenes:
        r.error('scenes', 'no "start" scene')
        return r

    def person(where, who, narrator=False):
        for w in ([who] if isinstance(who, str) else who):
            if w == 'narrator' and narrator:
                continue
            if w not in cast:
                r.error(where, f'"{w}" is not in the cast')

    def spot(where, to):
        if isinstance(to, str):
            if to not in marks and to not in props and to not in cast:
                r.error(where, f'unknown spot "{to}"')
        elif isinstance(to, dict) and 'near' in to:
            if to['near'] not in cast and to['near'] not in props:
                r.error(where, f'"near" names neither a person nor a prop: "{to["near"]}"')
        else:
            r.error(where, f'bad spot {to!r}')

    choices = []
    for name, beats in scenes.items():
        if not beats:
            r.error(name, 'empty scene')
            continue
        last = beats[-1].get('do')
        if last not in ('goto', 'end', 'choice'):
            r.error(name, f'ends with "{last}": a scene must end with goto, end or choice')
        for i, b in enumerate(beats):
            if b.get('do') == 'say' and b.get('with') == 'prev':
                j = i - 1
                while j > 0 and beats[j].get('with') == 'prev' and beats[j].get('do') != 'say':
                    j -= 1
                if beats[j].get('do') == 'say':
                    r.error(f'{name}[{i}] say', 'two lines at once: only one voice can speak at a time')
            where = f'{name}[{i}] {b.get("do")}'
            d = b.get('do')
            if d not in BEATS:
                r.error(where, 'unknown beat')
                continue
            req, opt = BEATS[d]
            missing = req - b.keys()
            extra = b.keys() - req - opt - {'do'}
            if missing:
                r.error(where, f'missing {", ".join(sorted(missing))}')
                continue
            if extra:
                r.error(where, f'unknown fields {", ".join(sorted(extra))}')
            if i == 0 and b.get('with') == 'prev':
                r.error(where, '"with": "prev" on the first beat of a scene')
            if 'who' in b:
                person(where, b['who'], narrator=(d == 'say'))
            if d == 'place':
                if ('who' in b) == ('item' in b):
                    r.error(where, 'place needs exactly one of who / item')
                if 'who' in b:
                    spot(where, b['at'])
                elif b['at'] not in marks:
                    r.error(where, f'unknown spot "{b["at"]}"')
                if 'item' in b and b['item'] not in props:
                    r.error(where, f'unknown prop "{b["item"]}"')
                if 'hold' in b and b['hold'] not in props:
                    r.error(where, f'unknown prop "{b["hold"]}"')
            if d == 'walk':
                spot(where, b['to'])
                if b.get('speed', 'walk') not in SPEEDS:
                    r.error(where, f'unknown speed "{b["speed"]}"')
            if d == 'look':
                spot(where, b['at'])
            if d == 'act' or (d == 'place' and 'act' in b):
                a = b.get('anim') or b.get('act')
                if a not in cat['actions']:
                    r.error(where, f'unknown action "{a}"')
            if d == 'face' or (d == 'place' and 'feel' in b):
                if b['feel'] not in cat['feelings']:
                    r.error(where, f'unknown feeling "{b["feel"]}"')
            if d in ('take', 'give', 'drop', 'knock', 'rebuild', 'spill', 'wipe') and b['item'] not in props:
                r.error(where, f'unknown prop "{b["item"]}"')
            if d == 'give':
                person(where, b['to'])
            if d == 'drop' and 'at' in b and b['at'] not in marks:
                r.error(where, f'unknown spot "{b["at"]}"')
            if d == 'door' and not str(b['at']).startswith('cubicle.') or d == 'door' and b['at'] not in marks:
                r.error(where, f'no door "{b["at"]}" in the {place}')
            if d == 'clothes' and not re.fullmatch(r'#[0-9a-fA-F]{6}', str(b['pants'])):
                r.error(where, f'pants must be a colour like "#5bd16b", not {b["pants"]!r}')
            if d == 'slide' and 'slide.ladder' not in marks:
                r.error(where, f'there is no slide in the {place}')
            if d == 'cam':
                if b['shot'] not in SHOTS:
                    r.error(where, f'unknown shot "{b["shot"]}"')
                person(where, b.get('on', []))
                if b['shot'] in ('close', 'group', 'two', 'over') and not b.get('on'):
                    r.error(where, f'a {b["shot"]} shot needs "on"')
            if d == 'fx':
                if b['type'] not in cat['fx']:
                    r.error(where, f'unknown effect "{b["type"]}"')
                for o in [b['on']] if isinstance(b.get('on'), str) else b.get('on', []):
                    if o not in cast and o not in props:
                        r.error(where, f'fx on unknown "{o}"')
            if d in ('say', 'choice'):
                texts = [b['text']] if d == 'say' else [b['question']] + [o.get('say', '') for o in b['options']]
                for t in texts:
                    for bad, good in NOT_THESE.items():
                        if re.search(r'\b' + re.escape(bad) + r'\b', t, re.I):
                            r.error(where, f'"{bad}" in "{t}": say "{good}" (American English, simple words)')
                    if re.search(r'\b(Ms|Mr|Mrs)\b(?!\.)', t):
                        r.error(where, f'"Ms"/"Mr" need a period in American English: "{t}"')
            if d == 'say':
                n = words(b['text'])
                if n > MAX_WORDS:
                    r.error(where, f'{n} words, keep lines to {MAX_WORDS} at most: "{b["text"]}"')
                elif n > 12:
                    r.warn(where, f'{n} words: "{b["text"]}"')
                if b['who'] not in cat['voiced']:
                    r.error(where, f'"{b["who"]}" has no voice in dev/voices.py VOICES')
            if d == 'goto' and b['scene'] not in scenes:
                r.error(where, f'no scene "{b["scene"]}"')
            if d == 'choice':
                choices.append((name, i, b))

    # ---- the question ----
    if len(choices) != 1:
        r.error('story', f'{len(choices)} choice beats; a story has exactly one question')
        return r
    cname, ci, choice = choices[0]
    if cname != 'start' or ci != len(scenes['start']) - 1:
        r.error('choice', 'the question must be the last beat of "start"')
    opts = choice['options']
    if len(opts) != 3:
        r.error('choice', f'{len(opts)} options; there must be three')
    kinds = [o.get('kind', '?') for o in opts]
    others = [k for k in kinds if k != 'good']
    if kinds.count('good') != 1 or len(set(others)) != 2 or not set(others) <= NOT_GOOD:
        r.error('choice', f'option kinds are {kinds}; need one good and two different of feeling, hurtful, avoid')
    elif 'hurtful' not in kinds:
        r.warn('choice', 'no hurtful choice: fine only when the problem has no natural hurtful impulse (say why)')
    question_shot = next((b['shot'] for b in reversed(scenes['start']) if b.get('do') == 'cam'), 'wide')
    for o in opts:
        w = f'choice {o.get("id")}'
        for f in ('id', 'icon', 'say', 'kind', 'goto'):
            if f not in o:
                r.error(w, f'missing "{f}"')
        if o.get('icon') not in cat['icons']:
            r.error(w, f'unknown icon "{o.get("icon")}"')
        if o.get('goto') not in scenes:
            r.error(w, f'no scene "{o.get("goto")}"')
        first = scenes.get(o.get('goto')) or []
        if question_shot == 'close' and not any(b.get('do') == 'cam' for b in first[:3]):
            r.warn(w, f'scene "{o.get("goto")}" should open with a camera shot: it keeps the close-up from the question')
        if words(o.get('say', '')) > MAX_LABEL_WORDS:
            r.warn(w, f'label has {words(o["say"])} words; keep it to {MAX_LABEL_WORDS}')
        if o.get('kind') == 'hurtful' and re.search(r"['\"‘’“”]", o.get('say', '').replace("'s ", ' ')):
            r.error(w, 'a hurtful label quotes words; say the action instead ("Shout at them")')

    # ---- every path ----
    good = next((o for o in opts if o.get('kind') == 'good'), None)
    clip = clips()
    durations = {}
    for o in opts:
        seen, scene, lines, secs = [], o.get('goto'), [], 0.0
        while scene and scene in scenes and scene not in seen:
            seen.append(scene)
            nxt = None
            for b in scenes[scene]:
                if b['do'] == 'goto':
                    nxt = b['scene']
                if b['do'] == 'end':
                    nxt = None
            scene = nxt
        if scene in seen:
            r.error(f'path {o.get("id")}', f'goes round in a loop: {" > ".join(seen + [scene])}')
            continue
        if not any(b['do'] == 'end' for s in seen for b in scenes[s]):
            r.error(f'path {o.get("id")}', f'never reaches the end: {" > ".join(seen)}')
        if good and o is not good and good.get('goto') not in seen:
            r.error(f'path {o.get("id")}', f'never shows the good way ("{good.get("goto")}")')
        if o is not good and not any(b['do'] == 'fx' and b.get('type') == 'rewind' for s in seen for b in scenes[s]):
            r.warn(f'path {o.get("id")}', 'no rewind before the good way')
        path_beats = scenes['start'] + [b for s in seen for b in scenes[s]]
        durations[o.get('id')] = estimate(path_beats, clip)
        bad = [b for s in seen[:1] for b in scenes[s]]
        if o.get('kind') == 'feeling' and any(b['do'] == 'act' and b.get('anim') in ('cry', 'crySit') for b in bad):
            if not any(b['do'] == 'say' and re.search(r"\bOK\b|\bokay\b", b['text']) for b in bad):
                r.warn(f'path {o.get("id")}', 'shows crying but never says it is OK to cry / feel sad')

    for oid, s in durations.items():
        if not PATH_S[0] <= s <= PATH_S[1]:
            r.warn(f'path {oid}', f'about {s:.0f} s; aim for {PATH_S[0]}-{PATH_S[1]} s')

    # ---- content rules ----
    end_lines = [b['text'] for s in scenes.values() for b in s if b['do'] == 'say' and b['who'] == 'narrator']
    if story['lesson'] not in end_lines:
        r.error('lesson', 'the lesson is never said by the narrator (say it word for word at the end)')
    hero = cast[0]
    upset_before = any(b['do'] == 'face' and b['who'] == hero and b['feel'] in UPSET for b in scenes['start'])
    if good and upset_before and not any(b['do'] == 'act' and b.get('anim') == 'breathe' and hero in ([b['who']] if isinstance(b['who'], str) else b['who']) for b in scenes.get(good.get('goto'), [])):
        r.warn('good path', f'{hero} is upset before the question but the good path has no big breath')
    for s, beats in scenes.items():
        for i, b in enumerate(beats):
            if b['do'] == 'say' and re.search(r'\b(my|mine)\b', b['text'], re.I) and re.search(r'\b(truck|teddy|car|ball|blocks?|book|crayons)\b', b['text'], re.I):
                r.warn(f'{s}[{i}]', f'classroom toys aren\'t "mine": "{b["text"]}"')
            if b['do'] == 'say' and b['who'] in cat['cast'] and cat['cast'][b['who']]['adult'] and re.fullmatch(r"(well done|good job|great)(,? \w+)?[!.]?", b['text'].strip(), re.I):
                r.warn(f'{s}[{i}]', f'praise should say what the child did: "{b["text"]}"')
            if b['do'] == 'say' and re.search(r'\balways\b', b['text'], re.I) and b['who'] != hero:
                r.warn(f'{s}[{i}]', f'"always" can be a promise a grown-up can\'t keep: "{b["text"]}"')

    # ---- people must be on stage before they do things ----
    shown = set()
    for b in scenes['start']:
        if 'who' not in b:
            continue
        who = [b['who']] if isinstance(b['who'], str) else b['who']
        if b['do'] in ('place', 'walk', 'slide', 'leave'):
            shown.update(who)
            continue
        for w in who:
            if w != 'narrator' and w not in shown:
                r.error('start', f'"{w}" is used ({b["do"]}) before being placed or walking on')
                shown.add(w)
    missing = [b['text'] for s in scenes.values() for b in s if b['do'] == 'say' and fnv(f"{b['who']}|{b['text']}") not in clip]
    if missing:
        r.warn('voices', f'{len(missing)} lines have no clip yet: run dev/voices.py')
    r.durations = durations
    return r


def estimate(beats, clip):
    secs, i = 0.0, 0
    while i < len(beats):
        group = [beats[i]]
        i += 1
        while i < len(beats) and beats[i].get('with') == 'prev':
            group.append(beats[i])
            i += 1
        secs += max(beat_s(b, clip) for b in group)
    return secs + 2.0   # the rewind


def beat_s(b, clip):
    d = b.get('do')
    if d == 'say':
        c = clip.get(fnv(f"{b['who']}|{b['text']}"))
        return c['dur'] if c else words(b['text']) * WORD_S + 0.4
    if d in ('walk', 'take', 'give', 'slide', 'rebuild', 'wipe'):
        return WALK_S + (2.0 if d in ('slide', 'rebuild') else 0)
    if d in ('wait',):
        return b['s']
    if d in ('look', 'drop', 'knock', 'spill'):
        return 0.6
    return 0.0


# ======== the script, for a parent to read ========

def script(story):
    scenes = story['scenes']
    choice = scenes['start'][-1]
    names = {**{k: v['name'] for k, v in catalogue()['cast'].items()}, 'narrator': 'Narrator'}

    def lines(scene):
        out = []
        for b in scenes[scene]:
            if b['do'] == 'say':
                out.append(f"  {names.get(b['who'], b['who'])}: {b['text']}")
            elif b['do'] == 'face':
                who = ', '.join(names[w] for w in ([b['who']] if isinstance(b['who'], str) else b['who']))
                out.append(f"      ({who} looks {b['feel']})")
            elif b['do'] in ('take', 'give', 'drop', 'slide', 'knock', 'rebuild', 'spill', 'wipe'):
                out.append(f"      [{b['do']} {b.get('item', '')} {names.get(b.get('who'), '')} {('to ' + names[b['to']]) if 'to' in b else ''}]".replace('  ', ' '))
            elif b['do'] == 'fx' and b['type'] == 'rewind':
                out.append('      [the picture rewinds]')
        return out

    print(f"{story['title']}  ({story['id']}, {story['place']})\nPrompt: {story['prompt']}\nLesson: {story['lesson']}\n")
    print('START'); print('\n'.join(lines('start')))
    print(f"\n  QUESTION: {choice['question']}")
    for o in choice['options']:
        print(f"    [{o['icon']}] {o['say']}  ({o['kind']})")
    done = set()
    for o in choice['options']:
        scene = o['goto']
        print(f"\nIF \"{o['say']}\":")
        while scene and scene not in done:
            done.add(scene)
            print(f'-- {scene}'); print('\n'.join(lines(scene)))
            scene = next((b['scene'] for b in scenes[scene] if b['do'] == 'goto'), None)
        if scene in done:
            print(f'-- then "{scene}" as above')


# ======== main ========

def main(args):
    cat = catalogue()
    if '--catalogue' in args:
        print_catalogue(cat)
        return 0
    index = json.loads((GAME / 'stories' / 'index.json').read_text(encoding='utf-8'))
    if '--script' in args:
        for sid in [a for a in args if not a.startswith('--')]:
            script(json.loads((GAME / 'stories' / f'{sid}.json').read_text(encoding='utf-8')))
        return 0
    ids = [a for a in args if not a.startswith('--')] or [e['id'] for e in index]
    errors = 0
    listed = {e['id'] for e in index}
    if not args:
        for f in (GAME / 'stories').glob('*.json'):
            if f.stem not in listed and f.stem not in ('index', 'shared'):
                print(f'warning: stories/{f.name} is not in stories/index.json')
        for e in index:
            for k in ('id', 'title', 'icon'):
                if k not in e:
                    print(f'error: index.json entry {e} has no "{k}"'); errors += 1
    for sid in ids:
        path = GAME / 'stories' / f'{sid}.json'
        if not path.exists():
            print(f'{sid}: error: no file {path.name}'); errors += 1
            continue
        try:
            story = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            print(f'{sid}: error: not valid JSON: {e}'); errors += 1
            continue
        r = check(story, cat, sid)
        entry = next((e for e in index if e['id'] == sid), None)
        if entry and (entry.get('title') != story.get('title') or entry.get('icon') != story.get('icon')):
            r.error('index', 'title or icon differs from stories/index.json')
        times = ', '.join(f'{k} ~{v:.0f} s' for k, v in getattr(r, 'durations', {}).items())
        status = 'OK' if not r.errors else f'{len(r.errors)} errors'
        print(f"{sid}: {status}, {len(r.warnings)} warnings{('  (' + times + ')') if times else ''}")
        for e in r.errors:
            print(f'  error: {e}')
        for w in r.warnings:
            print(f'  warning: {w}')
        errors += len(r.errors)
    return 1 if errors else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1:]))
