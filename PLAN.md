# What Should Frank Do? — engine plan

Working title. A player for short, talking, 3D choose-what-happens stories about everyday
kindergarten problems (someone takes your toy, you lose a game, a friend won't share, you feel left
out). Frank, a five-year-old boy, is the recurring hero; his kindergarten and his friends are the
recurring set and cast. Each story stops once at a problem, asks *"What should Frank do?"*, reads three
choices aloud with big picture buttons, and plays what happens next. Some choices go badly, gently,
and every path ends by showing what Frank could do, so the right way is always the last thing a child
sees.

The goal: write one line, *"a story about handling other kids taking toys"*, and get a whole
playable story from it.

## 1. The big idea: stories are data, the engine is fixed

```
 one-line prompt ──► Claude Code (authoring, offline) ──► stories/<id>.json ──► checker ──► voices ──► player
                      uses the catalogue                    (reviewed by a parent)          (ElevenLabs,
                      of cast, places, props,                                                optional)
                      actions and feelings
```

- **The player never generates anything.** Like every tb-x game it is static (no backend, no keys in
  the page), and a story a child sees should have been read by a parent first. So generation happens
  here, in Claude Code, and produces a JSON file that the player reads.
- **A story can only use what the engine can show.** The generator works from a *catalogue*: the cast,
  the places and their named spots, the props, the actions (walk, cry, wave, take, give…), the faces
  and the camera shots. The checker refuses a story that names anything outside it. When a new story
  needs something new (a swing, a puppet, rain), it is added to the code and the catalogue first, then
  the story is written. Over time the catalogue grows and stories get richer, but nothing is ever
  improvised at play time.
- **Every story follows one shape** (below), which keeps stories short, keeps the lesson clear and
  makes the generator reliable.

## 2. Story shape

1. **Hello** (recurring, 5–10 s): Frank arrives at kindergarten, waves, the narrator says who's there.
2. **Happy start** (10–15 s): Frank is doing something nice with friends.
3. **The problem** (5–10 s): something happens; Frank's face shows the feeling.
4. **The question**: *"What should Frank do?"* Three choices, each a big picture button, read aloud one by
   one with its button lighting up. Always:
   - one **feeling-only** choice that doesn't fix things (cry, sulk, hide),
   - one **hurtful** choice (grab back, push, shout),
   - one **good** choice (use words, ask a grown-up, take turns, calm down first).
   When the problem has no natural hurtful impulse (being scared of the toilet), the hurtful choice may
   be replaced by an **avoid** choice (holding it in), so the story doesn't invent unkindness.
   The good one is not always in the same place.
5. **What happens** (10–20 s per choice): natural, mild consequences, never punishment. Crying: the
   toy stays gone and Frank feels worse. Grabbing: the toy falls, both kids cry, the tower breaks. Good
   choice: it works.
6. **What Frank could do** (every path ends here): for a not-good choice, a *rewind* (the picture spins
   back like a tape) and the narrator says *"Let's think. What else could Frank do?"*, then the good way plays.
   The good path goes straight to the ending. The lesson is said in one short sentence a 5-year-old can
   repeat (*"Say STOP, that's mine. If it doesn't work, tell a grown-up."*).
7. **Happy end**: the friends make up, play together, stars. Buttons: try another choice ↺, next story ▶.

One path is 60–120 s. Lines are at most ~12 words, present tense, simple English.

### Content rules for the generator

- Name the feeling ("Frank feels sad", "Leo feels cross") on every side. The other child is never a
  villain; they have a reason (they wanted a turn) and they make up at the end.
- No shaming of the child playing: the question is about Frank, never "you were bad".
- Consequences are small and real: nobody gets hurt, nobody is told off harshly, the teacher is kind.
- Strategies come from a short list, so they repeat across stories and kids learn them: *use your
  words*, *say stop*, *ask a grown-up*, *take turns*, *trade*, *take a big breath*, *say sorry*, *ask to
  join*, *find another toy*.
- No brands, no real names except the cast, nothing scary.
- **Super simple American English** (since 2026-10-26): words a 5-year-old American child already knows,
  short sentences (aim for 8 words), "pee", "Mom", "pants", "mad", "clean up", "bathroom", "Ms. Rosa".
  `dev/check_story.py` refuses British and hard words (its `NOT_THESE` list).

Added after the child-development review of the first four stories (2026-10-24):

- **Choice labels say the action, never quote an insult or accusation** ("Shout at them", not "Shout,
  'You're mean!'"): every label is read aloud, again on every replay, and kids repeat exact words. Keep
  hurtful lines in the scenes short and free of name-calling.
- **A strong feeling is calmed first.** Whenever Frank is upset, the good path starts with a big breath
  (`act breathe` + "Frank takes a big breath."), then words, then a grown-up if words don't work.
- **Crying is never the mistake.** A feeling-only path that shows crying says so ("It's OK to cry when
  you feel sad."); what doesn't help is giving up or doing nothing.
- **Grown-ups name feelings first, then reassure or coach, and praise what was done** ("Frank, you used
  your words. Leo, you waited."), never just "Well done". They also coach the other child with the words
  they were missing ("Next time, ask, 'Can I have a turn?'").
- **Classroom toys aren't "mine"**: "the truck", "the teddy". Offers are questions ("Do you want to hold
  the teddy?").
- **The lesson uses the exact words the good path used**, so a child learns one phrase ("Good game!").
- Grown-ups never promise what they can't know ("Mum comes back at home time", not "always, after lunch").
- **Every choice's scene opens with its own camera shot** when the question ends on a close-up.

Added after the second review (2026-10-24):

- **An apology names what you did** ("Sorry, Sam. I knocked your tower down"), not an excuse; help is
  offered as a question ("Can I help you fix it?").
- **A hurtful path says plainly why it's wrong** when that isn't obvious (blaming: "Leo didn't do it.
  That isn't fair to Leo.").
- **When someone is hurt, the grown-up checks on them first**, then speaks to the one who did it.
- **Both children get labelled praise** in the good path, not only Frank.
- **Lesson phrases must work everywhere**, not only in this scene ("Can I go after you?", not "Can I go
  next?", which in a real queue means cutting in; "If someone bumps you…", not "When something goes wrong…").
- **Spread the roles**: don't let the same child always be the one who causes the problem (Leo took the
  truck, so Maya spills the juice). Don't show running indoors as the cause twice.
- Nothing risky on climbing equipment: a push happens at the foot of the ladder, never on it.

Added after the third review (toileting and bullying, 2026-10-24):

- **Privacy and dignity around the body**: nothing wet is ever shown; the child tells the grown-up,
  quietly, not the room; any coaching about it happens one-to-one, never in front of other children.
- **Fears get a small practice step** (listen to the flush together first, from a safe place), not just
  reassurance.
- **With a bigger or unkind child, the child never has to confront them alone**: the grown-up says so
  ("If saying stop feels scary, come straight to me"), telling a grown-up is "the right thing to do".
- **The grown-up stops the one who started it**: in a hurtful path the adult's first words go to the
  child who did the harm, never only to the victim.
- **Repeated unkindness isn't fixed with one sorry**: the grown-up stays involved ("I'll be watching. If
  it happens again, tell me again") and the child chooses whether to play.
- **No sound words like "Hmm", "Mmm", "Mhm"**: the voice can't say them naturally; use real words
  ("Let's think.", "Oh!", "Well,").
- Only one voice at a time: never two `say` beats together (`"with": "prev"`); the checker refuses it.

Added after the fourth review (consent, unkind words, transitions, frustration, 2026-10-24):

- **A child who freezes is never at fault**: the freeze path says so ("Frank didn't do anything wrong")
  and that it's never too late to tell a grown-up; it doesn't blame him for how the other child feels.
- **Whoever crossed a line is coached too**, even when the one who reacted badly is the one being
  stopped ("Zoe, next time, ask before a hug").
- **After a "no", the friendship is safe**: the grown-up tells the other child so ("He still likes you").
- **One feeling word per moment**: if the narrator says Frank is cross, Frank and the grown-ups say cross.
- **Lessons never sound like a way out** (asking to finish later still ends with helping tidy) and match
  the good choice's label and steps.
- **Vary where the good choice sits**; the feeling-only choice shouldn't always come first.
- Ideas waiting for their own stories: "they said no, so find another game".

## 3. Story file format

One JSON file per story in `stories/`, listed in `stories/index.json`. A draft of the toy story:

```json
{
  "id": "toy-taken",
  "title": "The red truck",
  "lesson": "Say STOP, that's mine. If it doesn't work, tell a grown-up.",
  "place": "classroom",
  "cast": { "frank": "frank", "taker": "leo", "teacher": "msRosa", "extras": ["maya", "zoe"] },
  "props": [ { "id": "truck", "at": "rug.frontA" }, { "id": "blocks", "at": "rug.frontB" } ],
  "scenes": {
    "start": [
      { "do": "place", "who": "frank", "at": "door" },
      { "do": "cam", "shot": "wide" },
      { "do": "walk", "who": "frank", "to": "rug.a" },
      { "do": "say", "who": "narrator", "text": "This is Frank. Frank is five." },
      { "do": "act", "who": "frank", "anim": "wave", "with": "prev" },
      { "do": "act", "who": "frank", "anim": "play" },
      { "do": "face", "who": "frank", "feel": "happy" },
      { "do": "say", "who": "narrator", "text": "Frank loves the red truck. Vroom, vroom!" },
      { "do": "walk", "who": "leo", "to": "rug.b" },
      { "do": "take", "who": "leo", "item": "truck", "from": "frank" },
      { "do": "face", "who": "frank", "feel": "surprised" },
      { "do": "cam", "shot": "close", "on": "frank" },
      { "do": "say", "who": "frank", "text": "Hey! I was playing with that!" },
      { "do": "choice", "question": "What should Frank do?", "options": [
        { "id": "cry",  "icon": "cry",     "say": "Cry",               "kind": "feeling", "goto": "cry" },
        { "id": "grab", "icon": "grab",    "say": "Take it back",      "kind": "hurtful", "goto": "grab" },
        { "id": "ask",  "icon": "teacher", "say": "Tell the teacher",  "kind": "good",    "goto": "words" }
      ] }
    ],
    "cry": [
      { "do": "act", "who": "frank", "anim": "cry" },
      { "do": "face", "who": "frank", "feel": "cry" },
      { "do": "say", "who": "narrator", "text": "Frank cries and cries." },
      { "do": "walk", "who": "leo", "to": "table.1" },
      { "do": "say", "who": "narrator", "text": "But Leo doesn't see. The truck is still gone." },
      { "do": "goto", "scene": "rewind" }
    ],
    "grab": [ "…tug of war, the truck falls, a wheel pops off, both cry…", { "do": "goto", "scene": "rewind" } ],
    "rewind": [
      { "do": "fx", "type": "rewind" },
      { "do": "say", "who": "narrator", "text": "Let's think. What else could Frank do?" },
      { "do": "goto", "scene": "words" }
    ],
    "words": [
      { "do": "act", "who": "frank", "anim": "stop" },
      { "do": "say", "who": "frank", "text": "Stop! I'm playing with it. You can have it next." },
      { "do": "face", "who": "leo", "feel": "sad" },
      { "do": "say", "who": "leo", "text": "But I want a turn!" },
      { "do": "walk", "who": "msRosa", "to": "rug.c" },
      { "do": "say", "who": "msRosa", "text": "Frank, you used your words. Well done!" },
      { "do": "say", "who": "msRosa", "text": "Leo, give it back. Then Frank gives you a turn." },
      { "do": "give", "who": "leo", "item": "truck", "to": "frank" },
      { "do": "goto", "scene": "end" }
    ],
    "end": [
      { "do": "act", "who": ["frank", "leo"], "anim": "play" },
      { "do": "fx", "type": "stars" },
      { "do": "say", "who": "narrator", "text": "Say STOP, that's mine. If it doesn't work, tell a grown-up." },
      { "do": "end" }
    ]
  }
}
```

Every `say` line also gets an `id` (added by the checker if missing) so its recorded clip can be found.

### Beats (the director's vocabulary)

| Beat | Fields | What it does |
| --- | --- | --- |
| `place` | `who`/`item`, `at`, `act`, `feel` | Puts an actor or prop on a spot, no animation (optionally already sitting, smiling…). |
| `walk` | `who`, `to`, `speed` (walk, run, tiptoe), `pace` | Walks to a spot and turns to face the spot's direction. `to` is a mark or `{ "near": <person or prop>, "gap": m }`; `pace` below 1 is slower (the one who loses a race). |
| `act` | `who` (one or a list), `anim`, `for` | Plays a body action: idle, walk, run, tiptoe, wave, cry, crySit, angry, jump, clap, reach, pickup, point, stop, hold, hug, talk, sit, play, sitChair. |
| `face` | `who`, `feel` | neutral, happy, joy, sad, cry, angry, surprised, worried. |
| `look` | `who` (one or a list), `at` | Turns to face an actor, prop or spot. |
| `say` | `who` (narrator or an actor), `text`, `id` | Plays the clip (or the device voice), moves the speaker's mouth, shows a speech bubble icon. |
| `take` / `give` | `who`, `item`, `to` (give) | Walks over if too far, reaches, then the prop changes hands. `take` picks a prop off the floor or out of someone's hand. |
| `drop` | `who`, `item`, `at` | Puts a held prop down. |
| `slide` | `who` | Playground: walks to the ladder, climbs, slides down the chute, hops off at `slide.bottom`. |
| `knock` / `rebuild` | `item`, `who` (rebuild) | A prop made of pieces (the block tower) falls apart / is built again, piece by piece, by `who`. |
| `spill` / `wipe` | `item`, `who` (wipe) | A cup tips over and a puddle spreads / someone wipes it up and stands the cup up. |
| `door` | `at` (a cubicle), `open` | Washroom: a toilet cubicle door swings open or shut. |
| `clothes` | `who`, `pants` ("#rrggbb") | Spare clothes: the trousers (or skirt) change colour. |
| `leave` | `who` | Goes out of the room, out of sight, until a `place` brings them back. |
| `cam` | `shot` (wide, group, close, over), `on`, `cut` | Camera move; shots frame the named actors automatically and follow them. |
| `fx` | `type` (stars, hearts, sparkle, bump, rewind), `on` | Small effects over people or props; `rewind` plays everything since the question backwards, fast, then puts it all back. |
| `sfx` | `name` | A sound effect (synthesized, or a clip). |
| `wait` | `s` | Pause. |
| `choice` | `question`, `options[]` | The decision screen (see UI). |
| `goto` / `end` | `scene` | Jump to a scene / show the end card. |

Beats run one after another; `"with": "prev"` runs a beat at the same time as the one before (Frank
waves *while* the narrator speaks). A beat finishes when its walk, animation or line finishes.

## 4. Engine modules (all plain ES modules, no build)

```
what-to-do/
  index.html            player: story picker, stage, choice screen, end card
  js/toon.js            shared toon materials, rounded boxes, canvas textures
  js/models/person.js   kids and grown-ups: body rig, faces, hair, clothes, held props, walking
  js/models/cast.js     the recurring cast (Frank, Leo, Maya, Zoe, Sam, Ola, Max, Ms. Rosa, Mr. Ben)
  js/models/props.js    the prop catalogue (truck, blocks, teddy, ball, dino, crayons, book, …)
  js/models/places.js   classroom and playground sets, each with named spots ("marks")
  js/anim.js            procedural body actions (pose functions, blended)
  js/stage.js           renderer, lights, the world group
  js/director.js        runs a story's beats, waits, parallel beats, goto, rewind
  js/camera.js          shot framing and smooth camera moves
  js/voice.js           device voice now; clips and mouth movement from loudness later
  js/fx.js              stars, hearts, sparkles, dust puffs
  js/ui.js              story picker, captions, choice buttons, icons, end card, sound and words buttons
  stories/index.json    the list of stories
  stories/<id>.json     one story each
  assets/voice/<id>/    recorded lines per story, assets/sfx/ for effects
  dev/models.html       the model viewer
  dev/check_story.py    the story checker                                            (to do)
  .claude/skills/new-story/SKILL.md   the "write a story from a prompt" recipe       (to do)
```

This breaks the single-`index.html` habit of the other kids' games on purpose, like Iron Perimeter: the
models, director and stories are shared by every story, and splitting them keeps each part readable.
Still static: serving the folder is enough.

### Characters (`person.js`)

- Built entirely in code from capsules and spheres in a chunky toy style with toon shading; no model
  files, so there is nothing to license and a new kid is one line in `cast.js`.
- A spec decides the look: kid or grown-up, skin, hair style (spiky, short, buzz, curly, bob, pigtails,
  ponytail, bun, long) and colour, shirt (colour, stripes, a star badge), trousers, shorts, skirt or
  dress, shoes, glasses, height.
- A simple rig of pivot groups (hips, torso, neck, shoulders, elbows, hips, knees) and a hand socket on
  each hand. Actions are small functions of time that return a pose; the person blends smoothly to
  each new pose, so actions can switch any time without popping.
- Faces are 3D pieces on the head (eyes, brows, cheeks, mouth shapes, tears), switched per feeling,
  with blinking and a talking mouth.
- Held props stay upright whatever the arm is doing.

### Places (`places.js`)

- The classroom (rug, low tables and chairs, toy shelf, reading corner, easel, cubbies and coat hooks,
  door, windows, bunting, alphabet, clock), the playground (slide, swings, sandbox, trees, bench,
  fence) and the washroom (three toilet cubicles with doors, low sinks with mirrors, towels, a
  hand-washing poster). Later: lunch room, cloakroom, garden, home.
- Each place exposes **marks**: named spots with a facing direction (`rug.a`, `rug.b`, `door`,
  `table.1`, `shelf`, `teacherChair`, `slide.bottom`…). Stories only ever say marks, never coordinates.

### Director (`director.js`)

- Walks the scene's beats with `async`/`await`; every beat returns a promise. A run token makes it safe
  to stop at any moment (home button, choice made early, rewind).
- Keeps a log of what happened, so `rewind` can play it backwards quickly (the actors' positions and
  poses over time) as the "let's try again" effect.
- Reports milestones to the local telemetry: `tbxEvent?.('story-choice', { story, option })` and
  `story-end`, so we can see which choices kids pick first and where they stop.

### Camera (`camera.js`)

- Shots instead of coordinates: `wide` (the whole set), `two` (two actors side by side), `close` (one
  face, for feelings), `over` (over one actor's shoulder at another). Framing is computed from the
  actors' positions and the screen's aspect, so it works on phones held either way.
- Smooth eased moves; a slow drift during long lines so the picture never feels frozen.

### Voice (`voice.js`)

- Each line plays a recorded clip if there is one, otherwise the device voice (`speechSynthesis`), so a
  new story can be played and checked before any credits are spent.
- The speaker's mouth moves with the clip's loudness (Web Audio `AnalyserNode`); with the device voice
  it flaps on word boundaries.
- Recording (later, asked first with the cost): ElevenLabs stock or Voice Library voices, never a clone.
  One narrator voice, one per recurring character. Clip file names come from the line `id`. Short lines
  are recorded together in one take and cut apart, then checked by ear (see the voice notes in memory).
  Rough cost: a story has ~40 lines of ~50 characters, about 2,000 characters, so about 2,000 credits;
  the Creator plan's 121,902 a month covers dozens of stories. Recurring lines ("What should Frank do?",
  "Let's think. What else could Frank do?") are recorded once and shared.

### Choice screen (`ui.js`)

- The picture dims, three big round buttons slide in (side by side, stacked on tall phones), each with a
  clear drawn icon (crying face, grabbing hand, teacher, speech bubble "STOP", two hands taking turns,
  deep breath, hug…). Icons are inline SVG from a small set in `ui.js`, so they look the same on every
  device (emoji vary).
- The question and each choice are read aloud in turn while its button pulses; tapping a button before
  the reading is finished is fine. 🔊 reads them again.
- No score, no red crosses. After a story the choices already seen get a small tick.

## 5. Writing a story from a prompt (the generator)

A Claude Code skill in this folder, `/new-story <prompt>`:

1. Reads the catalogue (cast, places and marks, props, actions, feelings, shots, icons, strategies),
   generated by `dev/check_story.py --catalogue` from the code so it can't go stale.
2. Writes `stories/<id>.json` following the shape and content rules above, picking the three choices
   and the strategy.
3. Runs the checker: valid beats and names only, every path reaches `end`, exactly one good choice,
   every not-good path reaches the good way, line lengths, total length per path.
4. Opens the story in the Browser pane (silent, `?tbxtest`) and plays each path to make sure it runs.
5. Shows the story as a short script for a parent to read, and asks before recording voices.

If a prompt needs something the catalogue lacks, the skill says what's missing (for example "a swing
and the playground") and offers to add it before writing the story.

### Since step 4 (2026-10-24)

- **Nobody walks through anybody**: walkers steer round people ahead of them and are nudged out of
  anyone's personal space; someone walking to a spot that's taken stops right next to it.
- **Faces**: eyelids (droopy when sad, slanted when cross, low when embarrassed), where the eyes look,
  two shines, arched brows, teeth and tongue, a wobbly mouth, and feelings that ease from one to the next.
- **Camera in conversations**: group shots favour whoever is talking (turn towards their face, centre a
  little more on them, a bit closer), and pick the side, or a higher angle, where no furniture or other
  child is in the way.

- **Painted faces (2026-10-24, now everyone's)**: `js/models/paintedFace.js` draws the eyes, brows,
  cheeks and mouth on a canvas shown on a thin shell hugging the front of the head (UVs projected from the
  front), so features follow the head's curve from the side. The older separate 3D features are still
  there with `{ face: '3d' }`; the viewer's Faces tab shows both side by side.

## 6. Local dialogue generation (options)

"Dialogue" here is two jobs: writing the lines, and saying them. Both can run on this laptop.

### Writing the story and its lines

| Option | How | Good | Not so good |
| --- | --- | --- | --- |
| **Claude Code** (the plan above) | `/new-story <prompt>` writes the JSON here, checker validates it | Best at following the content rules and the branching shape; already set up; no extra install | Needs the internet; not a button in the game |
| **Local LLM** (Ollama, llama.cpp or LM Studio, a 7–14 B model such as Qwen, Llama or Gemma) | A small script sends the same prompt and the catalogue, asks for JSON matching a schema (Ollama's structured output), then runs the same checker | Offline, free, unlimited retries; could sit behind a "new story" button on the local telemetry server (5200) | Noticeably weaker at the pedagogy rules and keeping five scenes consistent, so more parent editing; needs ~8–16 GB RAM or a GPU; model licences differ (Llama and Gemma have their own terms, Qwen mostly Apache 2.0) |
| **In the browser at play time** (WebLLM or transformers.js on WebGPU) | The game writes a story when the child asks | Feels magical | 1–4 GB download, slow or impossible on most tablets and phones, and kids would see text no grown-up has read. **Not recommended.** |

Recommendation: keep stories written ahead of time and read by a parent. Use Claude Code by default; a
local model is a reasonable offline fallback because the checker catches structural mistakes either way.
Nothing generates text while a child plays.

### Saying the lines (local text-to-speech)

| Option | Licence (check again before the first clip is published) | Notes |
| --- | --- | --- |
| **Device voice** (`speechSynthesis`, now) | Built into the device | Free and offline, but robotic, different on every device, no child voices |
| **Kokoro-82M** | Apache 2.0 (weights and code) | Small, natural-sounding English (US and UK, women's and men's voices), runs on the laptop's CPU from Python, also in a browser via `kokoro-js` (~80–300 MB). No child voices: kids would use lighter voices, slightly pitched up |
| **Piper** | Code MIT; **each voice has its own licence**, some non-commercial or with unclear training data | Very fast on CPU, plainer sound; pick only voices with a clear permissive licence |
| Coqui XTTS-v2, F5-TTS and similar | Non-commercial model licences; built around voice cloning | **Avoid**: cloning is off-limits for us and the licences don't fit a published game |

Recommendation: a `dev/voices.py` that pre-renders every line with **Kokoro** into
`assets/voice/<story>/<line id>.mp3`, one voice per character, exactly where ElevenLabs clips would
go. The player doesn't care which tool made a clip. That gives every story free, consistent voices on
every device, offline; ElevenLabs stays the option for the best voices (asked first, as always). Each
clip gets a line in the README's audio credits with the tool, voice and date, like the ElevenLabs ones.
Not running Kokoro inside the game: a big download for tablets with no gain over pre-rendered clips.

No speech recognition and no microphone: nothing a child says is recorded or processed (privacy rules
in the root CLAUDE.md).

## 7. Steps

1. **Draft models** (done 2026-10-24): kids, grown-ups, props, classroom and playground, a viewer with
   faces and actions, and a rough scripted test of the toy story's first half. → `dev/models.html`.
2. **Director, camera, choice screen** (done 2026-10-24): `index.html` plays the hand-written
   `stories/toy-taken.json` end to end with the device voice: story picker, captions (can be turned
   off), the choice screen read aloud, the rewind, the end card (choose again / start again), ticks on
   choices already tried. Testing: `?tbxtest` is silent, `?story=<id>` skips the picker, and
   `whatToDo.fastForward(seconds)` in the console runs the story ahead (the story's clock pauses while
   the page is hidden, so the hidden Browser pane needs it).
3. **Checker and generator skill** (done 2026-10-24): `dev/check_story.py` (the catalogue read from the
   code, every rule above, every path, timings, `--script` for parents) and the `/new-story` skill
   (`.claude/skills/new-story/SKILL.md`: plan, write, check, play every path, child-development review
   agent, voices). Three stories written with it from the reviewer's ideas: an accident and saying sorry,
   waiting for the slide, "Was it an accident?". The engine gained `slide`, `knock`/`rebuild`,
   `spill`/`wipe`, a wiping action, table places, slide spots, and group shots that film from whichever
   side isn't blocked by a tree or shelf.
4. **Voices** (done 2026-10-24, with Kokoro instead of ElevenLabs): `dev/voices.py` renders every line
   locally into `assets/voice/` with a `clips.json` list; kids are women's voices raised to a child's
   pitch (measured 250-280 Hz); the player plays the clips through Web Audio and moves the speaker's mouth
   with the loudness, falling back to the device voice for lines without a clip. Three more stories
   written (left out, losing a race, a sad friend) and reviewed by a child-development reviewer agent.
5. **Polish and publish**: sounds, icons, offline (`sw.js`, manifest), README, telemetry milestones,
   landing page, its own repo.

## Open questions

- Name: "What Should Frank Do?" for now. Should the hero always be Frank, or can a story star a friend?
- Language: English like the other 3D games, or Polish too (the voice clips would double)?
- Should a child be able to tap things during the happy start (like the Builder book), or only watch
  until the question?
