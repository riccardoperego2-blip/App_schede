# Feedback Forms

Three forms exist; they are intentionally short so testers actually
fill them in. We do not run a fourth form to "capture more". If we have
not learned what we need from these three, the answer is in the
interviews, not in more forms.

---

## Form 1 — Weekly Pulse (mandatory)

- Delivered: every Sunday 18:00 local via push + email.
- Tool: Google Form / Typeform.
- Read time: 60 seconds.
- Mandatory for all testers. Two consecutive misses → invite paused.

Questions:

1. **How many workouts did you complete this week?** (0–7)
2. **Did the prescribed workout match your level?**
   `(too easy / right / too hard / mixed)`
3. **Did you have any sync, crash, or strange behavior issue?**
   `(no / minor / serious)` — if not "no", one-line description.
4. **Did you skip a workout? Why?**
   `(no skip / time / fatigue / motivation / pain / app issue / other)`
5. **0–10 — how likely are you to keep using the app next week?**
6. **Anything you want us to know?** (free text, optional)

Storage: a Google Sheet exported nightly to a `feedback_weekly` table in
the alpha DB so it can be joined to analytics by `tester_id`.

---

## Form 2 — In-app Workout Feedback (per-session)

This lives in Profile → "Tell us about your workout" and is also offered
**once per session, after completion**, only if the prompt has not been
shown in the last 24 h.

- Read time: 10 seconds.
- Tool: in-app component that posts a `feature.used` event with
  `feature_key = "feedback.submitted"` and the form payload in
  `properties`.

Questions:

1. **How did today’s workout feel?**
   `(too easy / right / too hard / boring / great)`
2. **Did anything in the app get in the way?**
   `(no / yes — what)` — single short text input.

This is the **only place** where in-product feedback is collected.
We do not introduce additional in-app survey surfaces during alpha.

Payload shape (already supported by the analytics event taxonomy, no new
event):

```json
{
  "event_id": "<uuid>",
  "event_name": "feature.used",
  "category": "feature",
  "properties": {
    "feature_key": "feedback.submitted",
    "workout_day_id": "<uuid|null>",
    "rating": "too_easy|right|too_hard|boring|great",
    "friction_note": "<string, ≤200 chars>"
  }
}
```

---

## Form 3 — Tester Interview Script (week 3–4)

Format: 30 minutes, video call, screen share, one interviewer + one
note-taker. Recorded only with explicit consent. Recording is deleted
after the synthesis is written.

### Warm-up (3 min)

- "Walk me through the last workout you did with the app. Where, when, how."
- "Where do you keep your phone during a workout?"

### Onboarding (5 min)

- "Open the app and sign out. Sign back in."
- "Imagine you are starting today. Walk me through what you see."
- *Watch for*: hesitation, scrolling, back-tracking, comments.

### Workout (15 min)

- "Start today’s workout. Talk through what you are seeing and doing."
- *Watch for*: tap accuracy, weight entry, rest timer awareness, scroll
  patterns, places they ask "what does this mean?", times they hit back.
- Do not interrupt; note the time of every hesitation/question.

### Wrap-up (7 min)

- "If you could fix one thing about the workout screen, what would it be?"
- "Have you skipped a workout because of the app? Why?"
- "What would you tell a friend the app is for? In one sentence."
- "0–10 — would you keep using this if we charged a small monthly fee?"

### Synthesis template

Write the synthesis the same day, max 1 page:

```
Tester id: A### / persona: <name>
Device: <model / OS>
Top frictions (max 3):
1. ...
Wow moments (max 3):
1. ...
Quote of the day: "..."
Action items: <link to issues>
```

Synthesis files live in `docs/launch/interviews/<tester_id>.md` and are
referenced from the weekly review.

---

## Why these three are enough

- The **weekly pulse** measures retention intent and surfaces issues.
- The **in-app feedback** captures problems while they are fresh.
- The **interview** explains *why* the numbers look like they do.

We resist the temptation to add NPS prompts, modal surveys, smiley
ratings on every screen, etc. During alpha, signal density beats
volume.
