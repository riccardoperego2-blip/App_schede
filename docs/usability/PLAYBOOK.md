# Real-World Gym Usability Testing — Playbook

This is an operating manual, not a study proposal. The point is to find
out **where users stall, slow down, or quit** in real gym conditions —
not to make screens prettier.

Three rules:

1. **No new features.** If we cannot fix what we already shipped with
   the time we have, more surface area will not help.
2. **No mockups.** All testing happens on the current build (TestFlight
   / Play Internal), in real gyms, with real workouts.
3. **Every finding gets a severity score and a friction code.** If we
   cannot file it, we did not find it.

---

## 1. What we are measuring

Four orthogonal things. Each session must produce evidence on at least
two of them.

| Axis | Bad means | Good means |
|------|-----------|------------|
| **Speed** | Slow logging, slow navigation, perceived lag. | Set logged in ≤3 s, screen-to-screen ≤300 ms perceived. |
| **Clarity** | "What does this do?", hesitation, back-tracking. | Zero questions, first-try success on every action. |
| **Cognitive load** | Eyes off the bar/dumbbell, mental math, re-reads. | One glance, one tap, back to lifting. |
| **Robustness** | Sweat, gloves, fatigue, offline, interruption break the flow. | Same behaviour in any state. |

Polish, color palette, copy tone, brand voice → **out of scope for this
research**. Note them and move on.

---

## 2. Methods (when to use which)

| Method | Goal | Setting | Cadence | Output |
|--------|------|---------|---------|--------|
| **In-gym observation** | Real friction in real conditions | Tester's gym | 6/week phase 1, 4/week phase 2–3 | Observation sheet + friction log |
| **Moderated workout session** | Probe specific hypotheses | Tester's gym (preferred) or our space | 2–3/week | Moderator notes + clip references |
| **Sweaty-hand bench** | Touch accuracy under bad conditions | Lab bench, hand cream + water | 1×/round | Logging-speed table |
| **One-handed bench** | Reach + ergonomics | Lab bench, single hand | 1×/round | Reach map + miss-tap rate |
| **Fatigue-state task** | Cognitive load when tired | After a real heavy set | 2/week | Time + error rate |
| **Remote think-aloud** | Onboarding + dashboard | Home, Zoom | 3/week | Recording + path |
| **Diary study** | Drop-off causes between workouts | Tester's life | rolling | Daily 1-line entries |
| **Post-workout micro-interview** | Capture friction while fresh | Same day, async voice note | every workout (opt-in) | 60-s voice clip |

We deliberately privilege **in-gym observation** over lab tests. Real
gyms produce friction lab benches cannot fake (gloves, dim lighting,
loud music, locker rooms, basement signal, shared equipment).

---

## 3. The 12 in-gym scenarios

Every tester in a research cycle runs through a subset of these. Each
scenario has a single observation hypothesis.

| # | Scenario | Hypothesis under test |
|--:|---------|----------------------|
| 1 | Start the workout from the locker room (cold app start) | Cold-start latency hurts session start. |
| 2 | Log a set with the phone face-up on the bench | Visual obstruction or sweat on screen disrupts logging. |
| 3 | Log a set with gloves on | Touch precision drops; small targets fail. |
| 4 | Switch from your phone’s music app back to the workout mid-set | Background→foreground rehydration kills the flow. |
| 5 | Log a set while the rest timer is running | Timer + logging compete for the same screen. |
| 6 | Walk between machines while logging the previous set | Mid-walk tap accuracy + scroll behaviour. |
| 7 | Drop into airplane mode mid-workout, then back online | Offline/online transition is visible to the user. |
| 8 | Get a notification mid-set (system or other app) | Re-orientation cost when returning to the screen. |
| 9 | Talk to a friend / spotter for 60 s, then resume | Session restore + cognitive resume. |
| 10 | Replace a prescribed exercise on the fly (machine taken) | Substitution path: speed and confidence. |
| 11 | Finish the workout in a hurry (locker room closing) | Completion flow length under time pressure. |
| 12 | Try to undo a wrong rep count | Recovery from input error. |

Scenarios 2, 5, 6, 8, 10, 12 are **mandatory** every round. The others
rotate.

---

## 4. Recruiting and segmentation

We re-use the alpha tester pool from
[`docs/launch/TESTER_SEGMENTATION.md`](../launch/TESTER_SEGMENTATION.md).
Per round (2 weeks) we need:

- 6–8 in-gym observation sessions.
- 3 remote think-aloud sessions.
- 1 sweaty-hand + one-handed bench round (internal team, not testers).

Segment balance per round (target):

| Axis | Minimum coverage |
|------|------------------|
| Experience | ≥1 beginner, ≥1 advanced |
| Equipment | ≥1 commercial gym, ≥1 home |
| Device | ≥1 Android budget, ≥1 iPhone older |
| Goal | ≥1 hypertrophy, ≥1 strength |

If we cannot find a beginner this round, we postpone the round one
week. We never run a round without segment coverage; results from a
homogeneous sample mislead the backlog.

---

## 5. Session length and structure

Total session: **45 minutes** including travel buffer. Hard cap.

```
00:00–05:00   Consent + recap (no leading questions)
05:00–25:00   Real workout (one block, 3–4 exercises)
25:00–35:00   Moderator-driven scenarios (pick 3 from §3)
35:00–45:00   Micro-interview (template in INTERVIEW_TEMPLATES.md)
```

We do not interrupt the tester during their real working set. We
intervene only between sets. The instruction is explicit:

> "Lift the way you would on a normal day. Ignore us. If something on
> the app feels off, do not call it out — we will see it."

Why: testers who explain feel like helpers; we need them to **lift**,
not **report**.

---

## 6. Roles

Two-person crew per session, no more:

- **Moderator**: gives scenarios, asks the script questions, never
  hints. Holds the watch. Stops the session at 45 min.
- **Observer**: writes the observation sheet, codes friction events,
  notes timestamps for later clip references. Never speaks.

Single-person sessions are allowed in pinch but the data is weaker.
Mark them in the sheet (`crew_size = 1`) so the analyst weighs accordingly.

---

## 7. Recording

- **Video**: phone-back camera capturing the user’s phone screen and
  their hand. No face. Recording requires explicit consent in writing
  (consent form attached to the observation sheet).
- **Screen capture**: native screen recording **only if** the device
  permits it without granting unusual permissions. Otherwise skip.
- **Audio**: ambient mic on the moderator phone; we transcribe only the
  micro-interview, not the workout.

Recordings are deleted within 14 days. Only **clip references**
(filename + timestamp range) survive in the analysis. No raw recording
ever leaves the team’s local devices.

---

## 8. What we deliver per round

A round is two weeks. At the end of each round:

1. A populated **observation sheet** per session.
2. A consolidated **friction log** (CSV) with severity + friction code.
3. A round-level **usability scorecard** vs benchmark targets.
4. A **clip reel index** (1-line description + 5–30 s clip reference).
5. An **optimization backlog delta** (added / closed / reprioritized).
6. A 1-page **round report** posted in the team channel.

No long reports, no decks. The 1-page report is the artifact that
drives the iteration meeting.

---

## 9. Cadence

| Cadence | What | Owner | Time |
|---------|------|-------|------|
| **Weekly** | 4–8 sessions, observation sheets logged daily | Researcher + observer | rolling |
| **End of round (2 wk)** | Round report + backlog grooming | Researcher + product | 60 min |
| **Monthly** | Benchmark targets review against KPIs | Researcher + eng lead | 30 min |
| **Quarterly** | Friction taxonomy review (add/retire codes) | Researcher + product | 30 min |

We do not run a round if the previous round has not produced a written
backlog delta. This is enforced — the backlog is the product, not the
sessions.

---

## 10. What disqualifies a session

Throw the session out if any of:

- Tester did not actually do a workout (skip / cancel within 5 min).
- Recording corrupted to the point timestamps cannot be reconstructed.
- Tester is a close friend or family of the moderator (bias).
- Two scenarios from §3 were skipped due to time pressure.

Disqualified sessions count toward the segment coverage requirement —
i.e. we still need to find a beginner this round; the failed beginner
session does not exempt us.

---

## 11. Field kit

Bring exactly this. Nothing else.

- 1 GoPro / phone on a flexible mount (for the screen+hand video).
- 1 small bottle of water + hand cream (sweaty-hand simulation if the
  tester does not sweat naturally).
- 2 spare phone cables + power bank.
- Printed observation sheet (`sheets/observation-sheet.md`).
- Printed consent form.
- A timer that is not on the test phone.

Do not bring laptops, clipboards, tripods, or note-takers other than
the observer. The setup must look like two friends recording a lift,
not a research study.

---

## 12. Anti-patterns (what this system is not)

- It is not a focus group. We do not show mockups and ask opinions.
- It is not a survey. Surveys live in [`../launch/FEEDBACK_FORMS.md`](../launch/FEEDBACK_FORMS.md).
- It is not unmoderated remote testing. We tried; gym signal kills it.
- It is not "ride along with our friend at the gym". Friends produce
  biased data. Recruit acquaintances, not best friends.
- It is not a beta program. Beta validates demand; this validates UX.

If a request to add interviews, smiley ratings, in-app surveys, or
A/B prompts shows up, route it to the launch playbook instead.
