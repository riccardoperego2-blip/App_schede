# Usability Scorecard & Severity Scoring

Two scoring systems work together:

1. **Severity** — applied to every friction event in the log. Tells us
   how badly the event hurt the user. Drives triage.
2. **Round scorecard** — aggregates the round. Tells us whether the app
   is getting better, worse, or stuck.

Both are deliberately blunt. We do not want false precision; we want a
score we can argue with in 30 seconds.

---

## 1. Severity (per friction event)

A single integer **1–5**. Higher is worse. Defaults to **2** when in
doubt.

| Sev | Name | Definition | Action |
|----:|------|-----------|--------|
| **5** | Blocker | The user **could not finish** the action without external help, or the bug caused **data loss**. | Open as P1 in the launch severity matrix. Stop other work. |
| **4** | Major | The user finished, but it required workaround, restart, or visible frustration (rage tap, cursing, giving up partway). | Open as P2. Plan within the current sprint. |
| **3** | Moderate | Visible friction (mis-tap, back-track, ≥2 s hesitation, missed feedback) but the user recovered. | Open as P3. Plan within 2 sprints. |
| **2** | Minor | Small slip, single hesitation, user did not comment. | Track in friction log, file ticket only if pattern emerges. |
| **1** | Noise | One person, one time, no negative effect. | Log only. |

### Two rules that change the severity

- **Pattern rule**: if the same `(screen, code)` pair shows up at
  severity ≥2 in **≥3 distinct testers within a round**, the cluster is
  promoted **by one level** (max 5). Patterns beat one-off magnitudes.
- **Retention rule**: any friction tagged with a retention-risk
  indicator (see [`FRICTION_TAXONOMY.md`](./FRICTION_TAXONOMY.md) §3) is
  bumped **by one level**, with a floor at 3. We do not let
  retention-killing UX hide at sev 2.

### Mapping severity → existing engineering triage

| Usability severity | Maps to (alpha severity matrix) |
|-------------------:|---------------------------------|
| 5 | P1 |
| 4 | P2 |
| 3 | P3 |
| 2 | P3 only if pattern rule promotes |
| 1 | not tracked outside the friction log |

This keeps a single board for engineering, with usability findings
slotted alongside crashes and sync bugs.

---

## 2. Round scorecard (one number per axis, plus a composite)

Four axes, each scored **0–5** by the researcher after the round. The
researcher is the **only** scorer; consensus from the team is collected
but not averaged.

| Axis | What we look at |
|------|-----------------|
| **Speed** | Time-to-log-set, time-to-start-workout, time-to-resume-after-interruption, scroll/tap latency. |
| **Clarity** | First-try success rate, verbal questions per session, back-track count. |
| **Cognitive load** | Eye time on screen, fatigue-state task delta, "what does X mean?" count. |
| **Robustness** | Sweaty/one-handed/offline/interruption scenario success rates. |

### How a score is set

Pick **the closest** description; do not interpolate.

- **5** — Exceeds benchmark. No sev≥3 friction on this axis this round.
- **4** — Meets benchmark. ≤1 sev=3 cluster on this axis.
- **3** — Slightly below benchmark. 2 sev=3 clusters or 1 sev=4 cluster.
- **2** — Below benchmark. Multiple sev=3 or one sev=4 cluster reproduced
  on ≥3 testers.
- **1** — Far below. Any sev=5, or two sev=4 clusters on the same axis.
- **0** — Reserved for "we cannot answer this axis this round" (no
  segment coverage, no offline scenario run, etc.). Triggers a research
  follow-up; never used to mean "bad".

Benchmarks are defined in
[`KPI_FRAMEWORK.md`](./KPI_FRAMEWORK.md) §3.

### Composite

```
composite = round(0.35 * speed + 0.30 * clarity + 0.25 * cognitive + 0.10 * robustness, 1)
```

Weights reflect that **speed and clarity** are most retention-coupled
in gym usage. Robustness has weight 0.10 because reliability is
governed by the launch playbook's reliability KPIs; the usability axis
just confirms users feel it.

Composite ranges:

| Composite | Round verdict |
|----------:|---------------|
| ≥4.0 | Healthy. Ship more rounds, narrow on patterns. |
| 3.0–3.9 | Watch. Optimize the worst axis; another round before any feature work. |
| 2.0–2.9 | Stop new feature work. Dedicate at least 50% of the next sprint to UX fixes. |
| <2.0 | Launch hold. Re-evaluate alpha phase progression. |

---

## 3. Per-session scoring (lightweight, for trend)

The observer scores **each session** on the same 0–5 axes using the
same descriptions. These are the inputs the researcher uses for the
round scorecard. Per-session scores are also useful for tracking which
gym, device, or persona drives lower numbers.

Sheet row:

```
session_id, speed, clarity, cognitive, robustness, critical_failures, notes
A042-2026-05-13, 3, 2, 3, 4, 0, undo path failed on 12 reps -> 8
```

---

## 4. Worked example

A single tester session, 25-minute workout, 6 friction events logged:

```
H sev 2   weight_input        2 hesitations >2s
M sev 3   set_log_button      mis-tap on edit
R sev 4   plus_rep            rage-tap, 4 in 0.8s
T sev 3   rest_timer_finished missed end signal
N sev 1   offline_chip        unnoticed
C sev 5   workout_screen      cancelled mid-workout, blamed "the app is slow"
```

Per-session axes:

- Speed: 2 (rage tap + cancel + missed timer → speed is the issue).
- Clarity: 3 (mis-tap on edit, no other major confusion).
- Cognitive: 3 (one missed signal, but no "what is this?").
- Robustness: 4 (offline chip unnoticed is a sev 1; not enough to lower).

Pattern check (round so far): the rage tap on `+rep` shows up in 4 of
6 testers → cluster promoted to sev **5**. The cancel event is already
sev 5, so the round-level composite tanks.

If round composite < 2.0 → **launch hold** until the rage tap pattern is
fixed (likely a tap-target / debounce fix on `+rep`).

---

## 5. What the scorecard is not

- It is not a vanity metric. Score going up because we ignored the
  hard sessions is worse than not scoring.
- It is not a benchmark against competitors. We benchmark against our
  own previous round.
- It is not used to rank designers or engineers. Names do not appear on
  the scorecard.
- It is not a release gate by itself. The release gate is
  [`../launch/RELEASE_CHECKLIST.md`](../launch/RELEASE_CHECKLIST.md).
  The scorecard informs the gate; it does not replace it.
