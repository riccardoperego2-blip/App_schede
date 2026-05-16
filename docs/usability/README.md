# Real-World Gym Usability Testing — Index

This directory is the operating manual for finding out, in real
gyms, **where users stall, slow down, or quit** — and turning what
we find into a small, ordered list of fixes.

It does **not** produce new features. It does **not** redesign the UI.
It optimizes what we already shipped.

---

## Read in this order

1. **[PLAYBOOK.md](./PLAYBOOK.md)** — what we measure, methods,
   in-gym scenarios, recruiting, session structure, recording,
   deliverables, cadence, anti-patterns.
2. **[MODERATOR_SCRIPTS.md](./MODERATOR_SCRIPTS.md)** — five scripts
   (in-gym, fatigue-state, sweaty-hand, one-handed, remote
   think-aloud) and a universal "don'ts" list.
3. **[sheets/observation-sheet.md](./sheets/observation-sheet.md)** —
   printable observation sheet used in the field.
   **[sheets/friction-log.csv](./sheets/friction-log.csv)** — friction
   log template (CSV header + example rows).
4. **[FRICTION_TAXONOMY.md](./FRICTION_TAXONOMY.md)** — single-letter
   codes (H, M, R, T, ...), clusters, retention-risk indicators,
   analytics mapping.
5. **[SCORECARD.md](./SCORECARD.md)** — severity scoring (1–5), round
   scorecard, pattern + retention bump rules, worked example.
6. **[KPI_FRAMEWORK.md](./KPI_FRAMEWORK.md)** — five core KPIs,
   drill-downs, benchmark targets per phase, critical thresholds,
   SQL against existing materialized views.
7. **[INTERVIEW_TEMPLATES.md](./INTERVIEW_TEMPLATES.md)** — in-gym
   post-workout, remote think-aloud closing, micro voice-note,
   churn interview, banned questions.
8. **[OPTIMIZATION_BACKLOG.md](./OPTIMIZATION_BACKLOG.md)** — backlog
   item shape, priority matrix, iteration workflow, recipe book of
   recurring fix shapes, backlog anti-patterns.

---

## How it plugs into what already exists

This system reads from, and writes into, the systems built earlier in
the project:

- **Analytics warehouse** (`database/007_analytics_warehouse.sql`) —
  all KPI SQL runs against the existing materialized views and event
  taxonomy. **No new events.**
- **Launch playbook** (`docs/launch/*`) — usability severity maps to
  the alpha P1/P2/P3 severity matrix. Critical UX thresholds mirror
  the rollback triggers (hold-phase, not traffic rollback). Tester
  pool is the same.
- **Reliability docs** (`apps/mobile/RELIABILITY.md`) — robustness
  axis of the scorecard validates the reliability claims qualitatively.

---

## Two-week round at a glance

```
Mon W1     Round kick-off (segment coverage, scenario lock)
Tue–Fri    4–8 in-gym sessions + 3 remote think-alouds
Mon W2     1× sweaty-hand bench + 1× one-handed bench (internal)
Tue–Thu    Remaining in-gym sessions + analyst codes events
Fri W2     Round close: scorecard, clusters, backlog delta (60 min)
Mon W3     Sprint planning: DO NOW committed, RESEARCH rolled forward
Mon W3     Round R(n+1) starts in parallel
```

Total team time per round: roughly **8 person-days** across moderator,
observer, analyst, and product. If a round is taking more than that,
we are over-scoping; cut scenarios, not sessions.

---

## Five things this system is built to refuse

1. **Vanity polish work** — items without a cluster do not enter the
   backlog.
2. **Speculative redesigns** — every fix references existing surfaces.
3. **Lab-only validation** — sweat, gloves, and noise are
   non-negotiable test conditions.
4. **Tester praise as success metric** — only the scorecard composite
   and KPI deltas count.
5. **More research without a delta** — every round must close with a
   written backlog delta, or the next round does not run.

---

## Done means

The usability research loop is "done" when, across two consecutive
rounds:

- Composite scorecard ≥4.0.
- K1 TTL-set p50 ≤ phase 3 target.
- No retention-risk indicator open.
- No `RESEARCH` item older than two rounds.

At that point we narrow cadence to a monthly maintenance round and
hand the iteration loop to the product team. Until then, the loop
runs every two weeks without exception.
