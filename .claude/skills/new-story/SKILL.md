---
name: new-story
description: Write a new "What Should Frank Do?" story from a one-line prompt (e.g. "a story about waiting your turn"), check it, play every path, have it reviewed by a child-development reviewer agent, voice it with Kokoro and add it to the game. Use when asked for a new story, chapter or scenario for the what-to-do game.
---

# Write a new story

The prompt is the argument (for example `/new-story a story about telling the truth`). Work in the
`what-to-do/` folder. Everything below is local and free: no ElevenLabs, no PixelLab.

## 1. Read the rules and the catalogue

- Read `PLAN.md` section 2, **Story shape** and **Content rules** (including the rules added after the
  first review). They are the brief; follow them exactly.
- Run `python dev/check_story.py --catalogue`. A story may use only what it lists: the cast, a place
  and its spots, props, actions, feelings, shots, effects, icons and beats. Read one existing story in
  `stories/` (e.g. `left-out.json`) as a pattern.
- Look at `stories/index.json`: don't repeat a problem or a strategy that's already there, and vary who
  the other children are (give kids with few lines a turn).

## 2. Plan before writing

Decide, and say in a few lines:

- The **problem** (realistic for a 5-year-old at kindergarten), the **place**, the **cast** (Frank is
  the hero, first in `cast`; one or two other kids; a grown-up if the good way needs one).
- The **three choices**: one feeling-only or passive (doesn't fix it), one hurtful (an impulse a child
  really has, never cruelty for its own sake), one good (an evidence-based strategy: calm down, use
  words, ask, take turns, say sorry and help, ask a grown-up…). When the problem has no natural hurtful
  impulse (being scared of something, say), the second not-good choice may be `avoid` (holding it in,
  hiding from it) instead of `hurtful`; say why. Labels say the action, at most five
  words, and **never quote an insult or accusation**. Vary where the good choice sits.
- The **lesson**: one short, positive sentence with the exact words the good path uses.
- What it needs that the catalogue lacks. If something is missing (a new spot, prop, action, icon,
  place, or a new kind of beat), **stop and tell the user what you'd add**, then add it to the code
  (`js/models/places.js` marks, `js/models/props.js`, `js/anim.js`, `js/ui.js` ICONS, `js/director.js`
  beats, and the checker's `BEATS` in `dev/check_story.py`) before writing the story. Check new models
  and actions in `dev/models.html`.

## 3. Write `stories/<id>.json`

- `id` matches the file name (kebab-case). Fields: `id`, `title`, `icon`, `prompt` (the user's words),
  `lesson`, `place`, `cast`, `props`, `scenes` with `start`, one scene per choice, `rewind` and the good
  scene, and `end`.
- **start**: place everyone (`place` with `act`/`feel`), `cam` wide with `"cut": true`, the opening
  ("This is Frank. …"), a happy moment, the problem with Frank's face showing the feeling and the
  narrator naming it, then the `choice` as the last beat.
- **Every choice's scene opens with a `cam` beat** (the question often ends on a close-up, which would
  otherwise carry on). Group shots pick the side that isn't blocked, but keep people from standing in a
  line straight towards the camera's usual side, and keep other kids out of the foreground.
- **Not-good scenes**: mild, natural consequences; nobody hurt or shamed; crying is validated ("It's OK
  to feel sad"); end with `goto rewind`.
- **rewind**: `fx rewind`, a camera shot, narrator "Let's think. What else could Frank do?", `goto`
  the good scene.
- **Good scene**: if Frank was upset, start with `act breathe` and "Frank takes a big breath."; then the
  strategy in Frank's own words; the other child has feelings and a reason too; grown-ups name the
  feeling, coach the other child with the words they were missing, and praise what was done ("You used
  your words"), never a bare "Well done"; end with `goto end`.
- **end**: everyone happy together, `fx stars` or `hearts`, the lesson said by the narrator **word for
  word**, then `end`.
- Lines: present tense, at most 12 words (14 hard limit, aim for 8), super simple American English that a
  5-year-old already knows (pee, Mom, pants, mad, clean up, bathroom, Ms. Rosa; the checker refuses
  British and hard words),
  classroom toys are "the truck", not "my truck". Each path 35-130 s (aim for 50-90).
- Use `"with": "prev"` to run a beat during the one before (a line while someone walks).

## 4. Check it

```bash
python dev/check_story.py <id>
```

Fix every error; read every warning and fix it unless you can say why it's fine. Re-run until clean.
Then add the story to `stories/index.json` (same `title` and `icon`) and run `python dev/check_story.py`
for all stories.

## 5. Play every path (silently)

Start the `what-to-do` preview server (port 5228) and open `http://localhost:5228/?tbxtest` in the
Browser pane (`?tbxtest` keeps it silent; never play sound through the user's speakers). The hidden
pane barely renders, so drive the story's clock from the console. After editing files, refresh the
browser's copies first (`fetch(url, {cache: 'reload'})` for each changed file, then reload). Run:

The user may be playing in the same pane: before running anything, check the address has `?tbxtest`
and `whatToDo.voice.silent` is true; if not, navigate to `http://localhost:5228/?tbxtest` first (and
mention it), never drive the story with the sound on.

```js
const w = window.whatToDo, out = {}, errs = [];
if (!w.voice.silent) throw new Error('not in silent test mode: open ?tbxtest');
addEventListener('unhandledrejection', (e) => errs.push(String(e.reason?.message || e.reason)));
const story = await (await fetch('/stories/<id>.json', { cache: 'reload' })).json();
for (let opt = 0; opt < 3; opt++) {
  document.getElementById('start').hidden = true; w.ui.cancel();
  w.director.load(story); w.director.play();
  let t = 0; while (document.querySelector('.choice').hidden && t < 300) { await w.fastForward(1); t++; }
  const b = document.querySelectorAll('.opt')[opt]; b.click(); b.click();   // choices need two taps
  await new Promise((r) => setTimeout(r, 500));
  while (w.ui.endEl.hidden && t < 500) { await w.fastForward(1); t++; }
  out[w.director.path.join('>')] = t + ' s';
}
JSON.stringify({ out, errs });
```

Every path must reach the end card with no errors. Then look at the key moments (stop the loop at a
line with `document.querySelector('.caption').textContent.includes('…')`, `fastForward(0.8)`, take a
screenshot): is everyone visible, nobody standing inside
anyone or anything, faces readable, props where they should be? Fix spots and gaps (`"near"` with a
`gap`) and re-check.

While the pane is hidden its screenshots can lag, or show only a corner of the page. Then grab the
frame yourself: run a throwaway receiver in the scratchpad (a few lines of Python `http.server` on
127.0.0.1 that saves a POSTed data URL as a .jpg, with `Access-Control-Allow-Origin:
http://localhost:5228`), and in the page call `whatToDo.director.stage.render()`, draw
`stage.renderer.domElement` onto a 640 px canvas, and POST `toDataURL('image/jpeg')` to it. Read the
saved file, and stop the receiver when done.

## 6. Child-development review

Spawn a reviewer agent (Agent tool, general-purpose, read-only) with this brief, filling in the id:

> You are reviewing a short interactive story as an expert in early-childhood development and
> social-emotional learning (CASEL, Second Step, PATHS, the Incredible Years, Conscious Discipline),
> who knows how 4-6 year olds think, feel and talk. Read `PLAN.md` section 2 in the game folder (give the agent the folder's full path)
> (the story shape and content rules, including the rules added after the first review) and the story
> `stories/<id>.json`, every path (start, each option's scene, rewind, the good
> scene, end). Do not edit anything. Judge: realistic and emotionally safe for a 5-year-old; the three
> choices well chosen, clearly different, the good one what experts teach, in the right order; the
> labels understandable from a short spoken label and an icon; modelling risks (exact words kids might
> copy), consequences mild and natural, nobody shamed; grown-ups and the other children respond as a
> good kindergarten teacher would (naming feelings, coaching, labelled praise), the other child treated
> fairly; the lesson accurate, positive, short and repeatable, matching the words used; language
> simple, present tense, American English. Answer with a one-line verdict, then numbered issues, each
> with severity (must fix / should fix / nice to have), a brief reason, and the exact fix as
> replacement text for a specific line or beat (scene and position). Only flag what you'd genuinely
> change. Under 800 words.

Apply every must-fix and should-fix (and nice-to-haves that fit); where you disagree, say why. Add any
new general rule the review teaches to PLAN.md's content rules. Re-run the checker and the path test.

## 7. Voices

```bash
../_tools/kokoro/venv/Scripts/python dev/voices.py
```

It renders only new or changed lines (a few seconds each). A new speaker needs an entry in `VOICES` in
`dev/voices.py` first: kids are women's voices pitched to about 250-280 Hz (check with `--audition`,
which prints each voice's measured pitch, and ask the user to listen). Re-run the checker: the
"no clip yet" warning should be gone.

## 8. Finish

- `python dev/check_story.py --script <id>` and show the script to the user to read, with the path
  timings, what the review changed, and anything you added to the engine.
- Update the story list in `README.md` ("How it plays") and the audio credits if a new voice was added.
- Don't commit unless asked; when you do, follow the root CLAUDE.md leak check.
