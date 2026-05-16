# Tester Segmentation

A small alpha (≤200 testers) is only useful if the population is balanced
enough to expose systemic issues. We segment **before** sending invites,
not after.

---

## Segmentation axes

We slice testers on six axes. Each invited tester must be classifiable
on every axis from the waitlist form.

| Axis | Buckets |
|------|---------|
| Goal | hypertrophy, strength, fat loss, general |
| Experience | beginner (<1y), intermediate (1–4y), advanced (4+y) |
| Frequency | 2 d/wk, 3 d/wk, 4 d/wk, 5+ d/wk |
| Equipment | full gym, home dumbbells, calisthenics-only |
| Device | iPhone newer, iPhone older (<= iPhone 11), Android flagship, Android budget |
| Gym context | commercial gym, home, mixed |

The waitlist form is a Google Form with single-choice questions matching
these buckets. Outputs go straight into the invite spreadsheet.

---

## Target distribution

Across the whole alpha (~200), the target mix is:

| Axis | Bucket | Target % |
|------|--------|---------:|
| Goal | hypertrophy | 50% |
| Goal | strength | 20% |
| Goal | fat loss | 25% |
| Goal | general | 5% |
| Experience | beginner | 25% |
| Experience | intermediate | 50% |
| Experience | advanced | 25% |
| Frequency | 2 d/wk | 15% |
| Frequency | 3 d/wk | 40% |
| Frequency | 4 d/wk | 30% |
| Frequency | 5+ d/wk | 15% |
| Equipment | full gym | 60% |
| Equipment | home dumbbells | 30% |
| Equipment | calisthenics-only | 10% |
| Device | iPhone newer | 35% |
| Device | iPhone older | 15% |
| Device | Android flagship | 25% |
| Device | Android budget | 25% |
| Gym | commercial | 60% |
| Gym | home | 30% |
| Gym | mixed | 10% |

Deviations of ±5pp are fine. **Android budget ≥ 25%** is non-negotiable —
this is the segment where the reliability work pays off.

---

## Phase fill order

When opening phase 2 / 3, fill segments **starting with the underfilled
ones first** based on the current mix. A simple priority score per
waitlist applicant:

```
priority = sum(weight_axis * (target_pct[axis] - current_pct[axis]))
```

Higher priority = invite first. Spreadsheet formula in
`docs/launch/sheets/segmentation.gsheet`.

---

## Personas to recruit explicitly

We hand-pick at least 3 testers per persona for the closed alpha (phase 1):

1. **Returning gym-goer (intermediate, hypertrophy, 4 d/wk, full gym, iPhone)** —
   our default success persona; we want to see retention here.
2. **Total beginner (hypertrophy/general, 3 d/wk, home dumbbells, Android budget)** —
   biggest UX failure risk; will tell us if onboarding is too long.
3. **Strength-focused intermediate (3 d/wk, full gym, strength)** —
   to validate that progression and PR detection feel right.
4. **Time-constrained parent (3 d/wk max, fat loss, mixed equipment)** —
   adherence stress test, surfaces deload + readiness needs.
5. **Old phone / bad signal (Android budget, commercial gym basement)** —
   reliability + offline stress.
6. **Power user / coach background (advanced, 5+ d/wk, full gym)** —
   tells us if the prescribed loads/volumes are plausible.

Tag each persona in the invite sheet so we can slice retention later.

---

## Anti-patterns (who not to invite)

- Family members and best friends (they over-report kindness, under-report
  bugs). Pick acquaintances, not closest friends.
- People who already use 3+ fitness apps (their feedback is anchored to
  competitors).
- Influencers / public posters during alpha. We are not collecting reach;
  we are collecting signal.

---

## Invite tracking

The invite sheet has the following columns; this is the source of truth.

| col | description |
|-----|-------------|
| `tester_id` | short opaque id (`A001`, `B042`) — also used in support tickets |
| `email` | invite email |
| `phase` | 0/1/2/3 |
| `persona` | one of the persona tags above |
| `axes_json` | the six axes encoded as a JSON column |
| `invited_at` | timestamp |
| `installed_at` | nullable; set when we see first `app.opened` |
| `first_workout_at` | nullable; set when we see first `workout.completed` |
| `status` | invited / installed / activated / churned / removed |
| `notes` | free text |

A daily Looker / Metabase question joins this sheet (imported as a table)
with `analytics_events` on hashed email → `user_id` so we can compute
**activation by persona** and **retention by persona**.
