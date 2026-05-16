# Interview Templates

Four templates, one per moment. They are short on purpose. Long
interviews train testers to answer thoughtfully — we want **honest
first reactions**, not curated narratives.

Rules that apply everywhere:

- Stick to the script; deviate only to follow a thread, never to
  introduce a new one.
- Never describe a feature, screen, or upcoming change.
- 5-second pause after every answer. Most useful sentences come second.
- No "yes / no" framing. Open questions only ("how", "what", "when").

---

## 1. In-gym post-workout (10 min)

Run this at the end of script A. Tester is still sweating, still in
the workout's emotional state. Do not move to a café or quiet room
first — the loss of context costs more than the noise gain.

### Warm-up

1. "On a scale 0 to 10, how was that workout?" *(let them answer in a
   number; do not ask why)*
2. "If you could change one thing about how you logged today, what?"

### Friction probes (pick 2 the observer flagged)

For each probe the observer flagged with severity ≥3 in the friction log:

3. "I noticed at one point you tapped 4 times on the same button.
   What were you trying to do?" *(reference observed event without
   judgement)*
4. "When the rest timer ended, where was your attention?"
5. "When the app went offline, what did you think was going on?"

If no severity ≥3 event occurred, replace with:

3'. "Show me the moment you felt the app got in the way today."
4'. "What is one thing you wished the app did automatically that it did
not?"

### Mental model probe

6. "In one sentence, what is this app **for**?"
   *(file the answer verbatim — divergence between testers is data)*
7. "What does it do that your phone’s Notes app does not?"

### Retention probe

8. "How likely is it you will open this app tomorrow? Why?"
9. "What would make you delete it?"

### Free-fire close

10. "Anything I did not ask that you want to tell me?"

Stop. Thank. Leave.

---

## 2. Remote think-aloud closing (5 min)

Run at the end of script E. The tester has not actually worked out;
the question set focuses on **clarity** and **mental model**, not
in-the-moment friction.

1. "Now that you have seen it for 25 minutes — what is it for, in your
   words?"
2. "Who do you think this app is built for? Be specific."
3. "If you were going to keep using it, what would you need to be true
   for that to happen?"
4. "What was the most confusing screen today? Why?"
5. "What was the moment you understood the most?"

Two trap questions deliberately not asked: "would you pay for this?"
and "would you recommend it?". Both produce social-desirability noise.

---

## 3. Post-workout micro-interview (60-second voice note, async)

Sent as a daily prompt only to opted-in testers in the round. Voice
notes, not text. Voice keeps responses short and unfiltered. We do not
ship a feature to collect these — testers send Telegram voice notes to
a moderator account.

Prompt (read once at the start of the round, never repeated):

> "Right after a workout, send me a 60-second voice note. Answer
> three questions in order:
>
> 1. What did the app help you with today?
> 2. What did it get in the way of?
> 3. One word for how the app felt today."

We transcribe these into a flat file:

```
date, tester_id, helped_with, hindered_with, word
```

The **word** column is the highest-signal field. It surfaces
underlying themes faster than the prose. Common words → friction
hypotheses → next round scenarios.

---

## 4. Churn interview (15 min, voluntary)

Run this when a tester signals they will stop using the app, or when
they have not opened the app for 14 days. The point is to learn the
shape of **why people leave**, not to win them back.

Open with:

> "Thanks for letting me ask a few questions. I am not going to try to
> convince you to keep using the app. I want to understand what
> happened."

Questions, in this order:

1. "When did you stop using the app?"
2. "What were you doing differently the last time you opened it?"
3. "If the app had done one thing differently, would you still be
   using it? What thing?"
4. "Was there a single moment that pushed you off? A workout, a bug, a
   screen?"
5. "Did you replace it with something else? With what?"
6. "Did you tell anyone about the app? What did you say?"
7. "If we keep building, when should we reach out again?"

We code the answer to (4) into the friction taxonomy
(`FRICTION_TAXONOMY.md`). A single churn interview rarely speaks; five
of them speak loudly.

---

## 5. What we never ask

We have a permanent **banned list**. The whole team agrees on this
list; new researchers are walked through it before their first
session.

| Banned question | Why |
|-----------------|-----|
| "Would you use this app?" | Hypothetical → polite "yes". |
| "What features do you want?" | Users do not know; designers do. |
| "Do you like the design?" | Polite "yes" with no signal. |
| "Is the app easy to use?" | Strong positive bias. |
| "Would you recommend it?" | NPS bias; collect in survey, not interview. |
| "Did this make sense?" | Leads. Use "what does this mean to you?". |
| "Is there anything else?" (used as a hidden CTA for prompts) | Implies we are looking for praise. |

If a moderator catches themselves about to ask one of these, the rule
is: **stop, count to three, reformulate**.

---

## 6. Saving and indexing answers

Per interview, one short markdown file:

```
docs/usability/interviews/<round>/<tester_id>.md
```

Template:

```
---
date: 2026-05-13
tester_id: A042
moderator: <name>
template: in-gym-post-workout
---

# Highlights

- 0–10 today: 7
- Word: "okay-but-clunky"
- One change: "show last week's weight next to the input"

# Direct quotes

> "I'm always one tap away from cancelling by accident."
> "I never know if the rest timer started or not."
> "It feels like an Excel sheet that's trying."

# Friction codes referenced

H × 2 (workout_session), R × 1 (+rep), T × 2 (rest_timer), C × 0

# Action candidates

- file ticket for `+rep` rage tap pattern (see round backlog delta)
- probe rest timer audio cue in next round
```

These files are referenced from the round report; they are never
shared raw outside the team.
