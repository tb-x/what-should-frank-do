# What Should Frank Do?

Play it: **https://tb-x.github.io/what-should-frank-do/**

Short talking 3D stories for young kids (around age 5) about everyday kindergarten problems. Frank, a
five-year-old boy, plays with his friends; something goes wrong (someone takes his toy); the story stops
and asks *"What should Frank do?"* with three big picture buttons that are read aloud. Each choice plays
out, some go badly (gently), and every path ends by showing what Frank could do.

Stories are written from a one-line idea ("a story about handling other kids taking toys") here, with
Claude Code, into a small story file the game plays. See [PLAN.md](PLAN.md) for how the engine and the
story files work.

## How it plays

- Pick a story: **The red truck** (someone takes your toy), **Can I play too?** (joining a game),
  **The big race** (losing), **Zoe feels sad** (helping a sad friend), **Oops, the tower!** (saying
  sorry after an accident), **Was it an accident?** (when someone bumps into you), **Waiting for the
  slide** (waiting your turn), **Accidents happen** (a wee accident), **The loud toilet** (being scared
  of the kindergarten toilet), **Stop, walk, talk** (a bigger child who keeps being unkind), **Ask
  before a hug** (my body, my choice), **Unkind words** ("you're not my friend"), **Tidy-up time**
  (stopping when it's fun), **The tricky castle** (when something is hard).
- The story plays by itself: people walk, talk, feel things; every line is spoken, and the words show
  in a bubble at the bottom (the 💬 button turns the words off).
- At the problem the picture dims and three big round buttons appear (in the red truck: *Cry*, *Grab it
  back*, *Say STOP*). The question and each choice are read aloud one by one; tap one any time.
- The two not-so-good choices play out gently (the truck stays gone; the truck falls and both boys
  cry), then the picture spins back like a tape and the narrator says "Let's think. What else could Frank do?".
- Every path ends with the good way (in the red truck: Frank says "Stop!", tells Ms Rosa, gets the
  truck back and takes turns) and the lesson in one sentence.
- At the end: **?** goes back to the question to try another choice (choices already tried get a tick),
  the green arrow starts the story again. 🏠 goes back to all the games, the speaker turns sound off.

## Run it

Serve the folder, for example `python -m http.server 5228`, and open `http://localhost:5228/`. It needs a
local server (not opened straight from disk) because the story files and code modules are loaded
separately. The model viewer is at `http://localhost:5228/dev/models.html`: people with every face
and action, the toys, the places with their named spots, a rough scripted test, and **Faces**: each character's painted face next to the older 3D one, to compare from the front, at three-quarters and from the side.

## Play offline (add to Home Screen)

On iPhone or iPad, open the game in Safari, tap **Share → Add to Home Screen**, then open it once from
the new icon while online. After that it starts full screen and works without internet. A story's
voices are saved the first time it plays, so play each story once while online to have all of them
offline. Changes arrive on their own: the next online launch downloads them.

(How: `manifest.webmanifest` gives the icon and full-screen mode; `sw.js`, a service worker, keeps a copy
of every file the game has used.)

## Voices

Every line is a recorded clip in `assets/voice/`, made on this laptop with
[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), a free text-to-speech model (see below). A line
without a clip (a new or changed line not rendered yet) is read by the device's own voice instead.

To make clips after adding or changing a story, with Kokoro set up once in `../_tools/kokoro/` (the steps
are at the top of `dev/voices.py`):

```bash
../_tools/kokoro/venv/Scripts/python dev/voices.py
```

It renders only the lines that are new or changed, and deletes clips no story uses any more. Kokoro
has no children's voices, so the kids are women's voices raised in pitch to a 5-year-old's (about
250-300 Hz); each speaker's voice and pitch is in `VOICES` at the top of `dev/voices.py`.
`dev/voices.py --audition` makes a listening page (`dev/audition/index.html`) with every voice at
several pitches, and the cast as set, to choose by ear.

## Tuning knobs

- `js/director.js`: `NEAR` (how close people stand when they walk up to someone), `HAND_REACH`, `REACH_S`
  and `PICKUP_S` (how long a give or pick-up takes), `RECORD_EVERY` (rewind smoothness), and the
  narrator's pitch and speed in `NARRATOR`. Each character's pitch is worked out in `styleFor`.
- `js/camera.js`: `EASE` (how quickly the camera moves to a new shot) and `DRIFT` (its slow sway).
- `js/voice.js`: `CLIP_VOL` (0 to 1, voice loudness) and `WORD_S` (seconds per word for the device voice).
- `dev/voices.py`: `VOICES`, each speaker's Kokoro voice, speed and pitch.
- `js/models/cast.js`: how each person looks; `js/models/person.js`: body sizes in `KID` and `ADULT`;
  `js/anim.js`: how each action moves.
- The story itself is `stories/toy-taken.json`: change a line's `text` and the device reads the new words.

## Writing more stories

In Claude Code, `/new-story a story about …` writes a new story from one line: it plans the three
choices, writes the story file, checks it, plays every path, has a child-development reviewer check it,
makes the voices and adds it to the list. `python dev/check_story.py` checks every story (and
`--script <id>` prints one as a script to read through; `--catalogue` lists everything a story can use).

## For testing

`?tbxtest` on the address makes it silent, `?story=toy-taken` skips the picker, and in the browser
console `whatToDo.fastForward(10)` runs the story ten seconds ahead.

## Audio credits

All voices: Kokoro-82M v1.0 (Apache 2.0, by hexgrad), run locally with kokoro-onnx (MIT), rendered by
`dev/voices.py`. No ElevenLabs audio, no credit needed. `assets/voice/clips.json` lists every clip with
its text, voice, pitch and the date it was made.

- Spoken about 10% slower than Kokoro's normal speed, with longer pauses between sentences (0.45 s)
  and at commas (0.2 s); `SENTENCE_PAUSE`, `CLAUSE_PAUSE` and each speaker's speed are in `dev/voices.py`.
- Narrator: `af_heart`, speed 0.82. Lines avoid sounds like "Hmm" or "Mmm": Kokoro can't say them
  naturally (the tries are in `dev/audition/hmm-*.mp3`), so the rewind says "Let's think." instead.
- Frank `af_bella` ×1.28, Leo `af_sarah` ×1.32, Maya `af_heart` ×1.26, Zoe `af_aoede` ×1.4, Sam a blend
  of `af_bella` and `am_puck` ×1.32, Ola a blend of `af_heart` and `af_nova` ×1.32 (×n = pitch raised).
- Max (a bigger kid) a blend of `af_sarah` and `am_puck` ×1.3, a little lower than the others.
- All the kids speed 0.88; Ms Rosa `bf_emma`, Mr Ben `am_michael`, both speed 0.85.
