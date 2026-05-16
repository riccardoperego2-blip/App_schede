# UX Optimization Backlog & Iteration Workflow

The backlog is the only artifact this whole system exists to produce.
Sessions, scorecards, taxonomies — they all converge into a small,
ordered list of changes that fit into the alpha sprint.

Two rules:

1. **Every backlog item references a cluster** from
   [`FRICTION_TAXONOMY.md`](./FRICTION_TAXONOMY.md). No item, no cluster
   → does not belong in the UX backlog.
2. **Every backlog item has a measurable expected delta** on a KPI from
   [`KPI_FRAMEWORK.md`](./KPI_FRAMEWORK.md). If you cannot say what
   moves, you cannot say if it worked.

---

## 1. Backlog item shape

```yaml
id:              UX-013
cluster:         workout_session:R (rage tap on +rep)
description:     >
  +rep / +set tap targets are too small and feedback is delayed. 4 of 6
  testers in round R4 produced a 3+ tap burst within 1 s.
evidence:
  - friction_log: round_R4_friction.csv rows 38–41
  - clip_refs:    A042-r4-c02, B017-r4-c01, B023-r4-c01
  - analytics:    mv_rage_taps screen=workout_session target=plus_rep, 18 events / 6 users / 14 d
severity:        4
expected_delta:
  K4 RTR:        -50% on workout_session (from 0.42 → ~0.20 per session)
  K1 TTL-set p50: -0.5 s in fatigue state
effort:          S (≤2 days)
owner:           <eng>
constraint:      no new screens, no redesign, tap target ≥44pt, feedback ≤80 ms
acceptance:
  - In round R5, cluster workout_session:R has 0 sev≥3 events.
  - K4 RTR on workout_session weekly drops by ≥40%.
round_opened:    R4
round_closed:    (filled when verified)
```

These items live in the engineering tracker (GitHub / Linear) under
the **`ux-backlog`** label. The YAML body is pasted into the issue
description so the cluster + analytics references travel with it.

---

## 2. Priority matrix (impact × effort × retention risk)

A 3-axis matrix collapses to a single decision. Use the cells, not
intuition.

```
                        Effort
                        S (≤2d)         M (≤1 wk)        L (>1 wk)
                  ┌──────────────┬──────────────┬──────────────┐
   Retention risk │              │              │              │
   YES & sev ≥4   │   DO NOW     │   DO NOW     │   PLAN SPRINT│
                  ├──────────────┼──────────────┼──────────────┤
   Retention risk │              │              │              │
   YES & sev = 3  │   DO NOW     │   PLAN SPRINT│   RESEARCH   │
                  ├──────────────┼──────────────┼──────────────┤
   NO &           │              │              │              │
   sev ≥4         │   PLAN SPRINT│   PLAN SPRINT│   PLAN LATER │
                  ├──────────────┼──────────────┼──────────────┤
   NO &           │              │              │              │
   sev ≤3         │   BACKLOG    │   BACKLOG    │   DROP UNTIL │
                  └──────────────┴──────────────┴──────────────┘
```

- **DO NOW**: lands within the next sprint (≤2 weeks). Capacity is
  carved out before any non-UX work.
- **PLAN SPRINT**: scheduled in the next sprint planning meeting.
- **RESEARCH**: not enough evidence; run a specific probe next round
  (see §4 below).
- **PLAN LATER**: enters the long backlog with severity carried
  forward.
- **BACKLOG**: parked. Reviewed quarterly. Drops out if not promoted in
  two quarters.
- **DROP UNTIL**: explicitly out of scope until a new signal appears.

### Retention risk

The "retention risk" column is yes when the item references any of the
indicators in [`FRICTION_TAXONOMY.md`](./FRICTION_TAXONOMY.md) §3. We
do not negotiate this column; it is a fact, not an opinion.

---

## 3. Iteration workflow

A round is two weeks. Each round produces a backlog **delta**, not a
new backlog. Cumulative state lives in the tracker.

```
   Mon W1
   ┌─────────────────────────────────────────┐
   │ Round R(n) kick-off                      │
   │ - confirm segment coverage               │
   │ - assign moderator/observer pairs        │
   │ - lock the 3 scenarios per session       │
   └─────────────────────────────────────────┘
                  │
                  ▼ daily
   ┌─────────────────────────────────────────┐
   │ Sessions run, sheets submitted within   │
   │ 24h. Analyst codes events into the      │
   │ friction taxonomy.                      │
   └─────────────────────────────────────────┘
                  │
                  ▼ Fri W2
   ┌─────────────────────────────────────────┐
   │ Round close (60 min meeting)            │
   │ - scorecard published                    │
   │ - clusters reviewed                      │
   │ - backlog delta drafted                  │
   │ - retention-risk indicators flagged      │
   └─────────────────────────────────────────┘
                  │
                  ▼ Mon W3
   ┌─────────────────────────────────────────┐
   │ Sprint planning (45 min)                │
   │ - DO NOW items committed                 │
   │ - PLAN SPRINT items scheduled            │
   │ - RESEARCH items rolled into R(n+1)      │
   └─────────────────────────────────────────┘
                  │
                  ▼
                R(n+1) starts on Mon W3, in parallel with the sprint.
```

### Roles in this workflow

| Role | Responsibility |
|------|----------------|
| **Researcher** | Owns scorecard, clusters, backlog delta. |
| **Product** | Owns priority matrix decisions. |
| **Eng lead** | Owns effort estimates and sprint commitment. |
| **Moderator/observer** | Owns the field data. |
| **On-call eng (launch playbook)** | Files P1/P2 from severity ≥4 items as needed. |

If product and researcher disagree on a priority cell, the **round
report** records both positions, and the next round adds a scenario
that probes the disagreement. We do not break ties by seniority.

---

## 4. RESEARCH items (data gaps)

A RESEARCH item is not a backlog item to "do later". It is an explicit
instruction for the next round's protocol. Each RESEARCH item maps to:

- A scenario added or modified in `PLAYBOOK.md` §3 for the round.
- A specific KPI or cluster to probe.
- A "decision rule" — what outcome would close the gap.

Template:

```yaml
id:              RX-007
parent_cluster:  workout_session:T (timer misses)
hypothesis:      >
  Testers are missing the rest-timer end because audio + haptic are
  both off in commercial gyms; vibrate-only is not strong enough.
probe:
  - scenario_round_R(n+1): repeat scenario 5 in heavy-music gyms.
  - in-gym observation: log which feedback modality was active.
decision_rule:   >
  If ≥4 of 6 testers in heavy-music gyms miss the end signal with
  haptics-only, file UX-#### "haptic strength / audio fallback".
  Otherwise, demote the cluster.
round_opened:    R(n)
```

RESEARCH items keep the backlog small. They prevent the team from
shipping a fix to a problem we have not actually understood.

---

## 5. Optimization patterns we keep seeing (a recipe book)

We track recurring "fix shapes" so we do not redebate them every round.
These are not rules — they are starting points the team should justify
or override.

| Cluster pattern | Default optimization shape |
|-----------------|----------------------------|
| `*:R` rage tap on primary action | Tap target ≥44 pt; debounce 250 ms; immediate visual feedback ≤80 ms. |
| `*:K` keyboard covers target | Use numeric pad for weight/reps; persistent inline value chip. |
| `*:T` timer missed | Add haptic strong + audio (configurable); banner persists 8 s. |
| `*:O` offline confusion | Persistent chip on workout screen with sync state; queue size visible. |
| `*:L` logging error not recoverable | Long-press to edit (and undo within 5 s); confirm only destructive cancels. |
| `*:B` back-track on onboarding step | Show step provenance (why we are asking); allow skip + confirm. |
| `*:N` notice failure | Move feedback inline next to the action, not in a toast. |
| `*:S` scroll struggle | Sticky primary action; reduce above-the-fold density. |

All of these are **non-redesigns** — they touch microinteractions,
spacing, and feedback timing. None of them introduce new flows.

---

## 6. Closing an item

A backlog item closes when **all three** are true:

1. The acceptance criteria are met **in the next round of testing**.
2. The matching KPI moved by the expected delta (or better).
3. The cluster reports 0 sev≥3 events for at least one round.

If 1 and 2 hold but 3 does not — the item is **re-opened** in the next
round with a new hypothesis. We do not declare victory based on
metrics alone.

If 1 and 3 hold but 2 did not move — we **invalidate the KPI mapping**
for that cluster and review whether we are measuring the right thing.

---

## 7. Anti-patterns in the backlog

We tag and reject items that fit any of these:

- **"Polish"** without an attached cluster → rejected.
- **"Redesign of X"** → rejected. This system optimizes existing
  surfaces.
- **"Add tooltip"** → rejected. Tooltips treat the symptom, not the
  cause. Use better labels instead.
- **"Confirm dialog"** as a default → rejected. Confirms are slow;
  reserve for destructive actions only.
- **"Onboarding tour"** → rejected. Tours have ~30% completion at best
  and do not durably move clarity KPIs.
- **"Gamification element"** → out of scope for usability work.

If a teammate is tempted to file one of these, they instead open a
RESEARCH item describing the underlying frustration. The next round
will produce the correct optimization.
