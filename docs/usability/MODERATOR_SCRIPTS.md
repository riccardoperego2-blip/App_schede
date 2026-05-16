# Moderator Scripts

Five scripts, one per setting. Each is short on purpose: a moderator
reading more than 3 sentences in a row is a moderator who is steering.

Rules that apply to every script:

- Never ask a leading question. "Is the timer easy to use?" → no.
  "Walk me through what you just did." → yes.
- Silence is data. Wait 7 seconds after a question before adding
  anything.
- Do not show emotion at success or failure. Both are useful.
- If the tester asks "what does this do?", repeat the question back:
  "What do you think it does?"
- If the app crashes, stop the script, capture context, file a P1
  candidate, then resume. Do not soften the tester’s read of the crash.

---

## Script A — In-gym observation (the main one)

Use this for every in-gym session. 45 minutes total, hard cap.

### A.1 Opening (5 min)

> "Thanks for letting us tag along today. Two things before we start.
>
> One: do the workout you would do today. Not a demo. Not a tutorial.
> Forget we are here.
>
> Two: if something on the app feels off, do not stop to tell us. We
> will see it. Tell us afterwards.
>
> We are going to record your phone screen and your hands. Not your
> face. Recording is deleted within two weeks. You can stop anytime.
> Sign here?"

Wait for signature. Start recording. Note start time.

### A.2 During the workout (~20 min)

The moderator says **nothing**. The observer codes friction events on
the observation sheet. If the tester asks a question, the moderator
answers only: "Do what you would normally do."

Flags the observer codes in real time:

- ⏱ **Hesitation** (≥2 s eyes on screen without acting).
- ✋ **Mis-tap** (tap that did not produce the intended action).
- 🌀 **Back-track** (Back button or swipe-back used to recover).
- 🤔 **Verbal question** ("what is this?", "where is X?").
- 🔁 **Repeated tap** (3+ taps within 1 s — likely rage tap candidate).
- 📵 **Connectivity event** (offline indicator visible, retry triggered).
- ⏳ **Timer attention loss** (tester missed the rest-end signal).

Each flag → one row in the friction log with timestamp + screen + brief
note. The note never editorializes ("user is confused"); it describes
("tapped weight field 3× before keyboard appeared").

### A.3 Between-set probes (only between sets, not during them)

Pick at most **two** of these per session. Keep them under 10 seconds.

> "When you logged that last set, what were you looking at first?"

> "If the app was not here, how would you have tracked that set?"

> "On a 0–10 — how much attention did the app just take from your lift?"

### A.4 Scenarios (10 min, after the working sets)

Pick 3 from `PLAYBOOK.md` §3. Read each one in the **user's** words,
not feature words.

Example — scenario 5 (timer + logging):

> "Start the rest timer. While it counts down, log the last set on the
> next exercise. Show me what you would do."

Example — scenario 12 (undo):

> "Pretend you tapped 12 reps but you actually did 8. Get it back to
> 8. Show me what you would do."

Example — scenario 7 (offline):

> "Turn airplane mode on. Log this next set. Then turn airplane mode
> off. Tell me what you saw."

Do not narrate what the app is doing while they work. Watch.

### A.5 Closing (10 min — interview)

Use the template in [`INTERVIEW_TEMPLATES.md`](./INTERVIEW_TEMPLATES.md)
§1 (in-gym post-workout). Stop recording when the last question is
answered. Thank the tester. Leave.

---

## Script B — Fatigue-state task

15 minutes. Run this right after the tester finishes a real heavy set
on a compound (squat, deadlift, bench, press). The whole point is to
test the app while the tester is breathing hard.

### B.1 Setup (1 min, before the set)

Tell the tester:

> "After this set, I am going to ask you to do three small things on
> the app. We will time you. Pretend nothing is different from a
> normal day."

### B.2 The set

Tester executes their planned set normally. Moderator does not
interfere.

### B.3 The three tasks (within 60 s of rack)

Time each task with a stopwatch (not the test phone). Record:

- start time (s),
- finish time (s),
- attempts (1 = first try, 2+ = retried),
- comments only if the tester volunteers them.

Tasks (always in this order):

1. **Task F1** — "Log this set." (target ≤6 s)
2. **Task F2** — "Open the next exercise." (target ≤4 s)
3. **Task F3** — "Set the rest timer to 90 s." (target ≤4 s if the
   prescribed rest is not already 90 s; otherwise skip)

### B.4 Probe (≤1 min)

> "How did that feel compared to logging on a normal day?"
> *Wait. Do not prompt.*

Write down: any word the tester says about cognitive load (slow,
foggy, blurry, tired, off). These words feed the
[`FRICTION_TAXONOMY.md`](./FRICTION_TAXONOMY.md) cognitive bucket.

### B.5 Done

Do not repeat the fatigue task in the same session. The recovery
contaminates the data.

---

## Script C — Sweaty-hand bench

20 minutes. Internal team only (the gym environment is artificial).
Use a calm room, a real device, and:

- A small bowl of water.
- A pump of hand cream (mimics oily skin).
- A towel.

### C.1 Baseline (clean hand)

Tester performs the **standard task sequence** below with clean hands.
Record times.

### C.2 Sweat condition

Tester dips fingers in water for 5 seconds, shakes off excess. Performs
the same task sequence. Record times.

### C.3 Oil condition

Tester applies hand cream, rubs in. Performs the same task sequence.
Record times.

### Standard task sequence

Always in this order:

1. Open the app from a cold start (kill, then open).
2. Start today's workout.
3. Log the first set as 80 kg × 8.
4. Start the rest timer.
5. Log the second set as 80 kg × 7.
6. Change the third set's rep count from 8 to 6 (undo / edit path).
7. End the workout.

For each step, record:

- time to complete (s),
- mis-tap count (taps that did not register or hit the wrong target),
- if the keyboard had to be dismissed and re-opened,
- any UI feedback the tester missed (e.g. did not notice the toast).

### C.4 Output

A single CSV row per condition per tester:

```
tester_id, condition, t1, t2, t3, t4, t5, t6, t7, mistap_total
```

Three testers × three conditions = 9 rows per round. Trend over rounds
is the deliverable.

---

## Script D — One-handed bench

20 minutes. Internal team. Same room. Tester uses **only the dominant
hand** the entire test; the other hand stays at their side.

Run the **standard task sequence** from script C twice:

1. Phone held in the hand performing the task.
2. Phone resting on a table, single-finger interaction.

For each step, in addition to time and mis-taps, record:

- **Reach failures**: number of targets the thumb could not reach
  without shifting grip.
- **Grip shifts**: number of times the tester re-gripped to reach.

Output: a one-page "thumb reach map" annotating which screens forced
grip shifts. We do not redesign the UI from this — but we file a
P3/P2 ticket against any screen that forced more than one grip shift
in three out of three testers.

---

## Script E — Remote think-aloud (onboarding + dashboard)

30 minutes. Zoom with screen share. Used for testers we cannot visit.

### E.1 Setup (3 min)

> "I am going to ask you to do a few things on the app and tell me out
> loud what you are thinking. Say everything — even 'I don’t know what
> this means'. There are no wrong answers. Share your screen."

### E.2 Tasks

In this order, no skipping:

1. **First impression** — *"Open the app. Tell me what you see."* (60 s)
2. **Sign-up** — *"Make a new account as if it were your first time."*
3. **Onboarding** — *"Walk me through it. Say everything."*
4. **Dashboard** — *"Now you are signed in. Tell me what this screen
   is for, in your own words."*
5. **Start workout** — *"Pretend you are going to the gym in 10 minutes.
   What do you do here?"*
6. **History** — *"Find your last workout. Tell me what you would do
   if you wanted to know whether you improved."*

After each task: 3-second pause, then **"What were you thinking right
there?"** at the moment of any hesitation.

### E.3 Closing (5 min)

Use [`INTERVIEW_TEMPLATES.md`](./INTERVIEW_TEMPLATES.md) §2 (remote
think-aloud closing).

---

## Universal don'ts

- Do not say "this is just a test" — testers infer they should be
  forgiving.
- Do not say "this is hard for everyone" — testers infer they should
  not report.
- Do not say "we know about that one" — testers shut down.
- Do not show the next build, prototype, or wireframe.
- Do not promise a fix in the meeting. Promises live in the
  optimization backlog, not in the room.

Read these out loud once before each session. They sound trivial; they
are not.
