# Issue Severity Matrix

We use four severity levels. Severity drives **SLA**, **on-call paging**,
and **rollback eligibility**. Severity is set by the on-call triage
engineer within 1 hour of report.

---

| Sev | Name | Definition | Examples | Response SLA | Resolution SLA | Pages on-call? |
|----:|------|-----------|----------|--------------|----------------|----------------|
| **P1** | Critical | App unusable, data loss, security/privacy breach, or a rollback trigger fired. | Crash on launch; lost workout sets after sync; auth bypass; cannot complete any workout. | 30 min | 24 h or rollback | Yes (immediate) |
| **P2** | High | Core flow broken for a subset of users, or reliability KPI breach without rollback. | Onboarding broken on one OS; offline queue stuck for one endpoint; >5% sync failures; PR detection misfires. | 2 h | 72 h | Yes (business hours) |
| **P3** | Medium | A specific feature is degraded but the user has a workaround. | Rest timer drifts by 1 s on backgrounding; dashboard widget wrong; one screen slow. | 1 business day | next release | No |
| **P4** | Low | Cosmetic, copy, or polish; not blocking any flow. | Layout glitch on one device; wording unclear; non-essential animation jank. | 3 business days | when convenient | No |

### What "data loss" means in P1

We treat it as P1 if **any** of the following are true:

- A completed set is missing after a sync round-trip.
- A workout shows as completed but is missing logged sets.
- A PR record disappears.
- Onboarding answers reset after a normal app restart.
- The offline queue silently drops a mutation (no error, no event).

### What is **not** P1

- App is slow but recoverable.
- A screen looks ugly.
- One device model has a non-blocking visual glitch.
- A tester does not understand a screen (this is P3 UX).

---

## Triage decision tree

```
                  ┌─ data loss / privacy / sec? ───────► P1
                  │
report received ──┤
                  │
                  └─ reproducible?
                       │
                       ├─ yes ─ core flow broken for ≥10% testers? ─► P2
                       │                                              │
                       │                                              └─ otherwise ─► P3
                       │
                       └─ no  ─ collect logs / repro steps; tag P3 pending repro
```

---

## On-call rotation

- One engineer is on-call per week, Mon–Sun.
- Alerts route to PagerDuty / opsgenie / a `#alpha-alerts` Slack channel
  (whichever is wired). Alpha on-call answers within the response SLA.
- On-call hands off in a 10-minute Monday call. Open P1/P2 are walked
  through and reassigned if needed.

---

## Severity → action

| Sev | Triage action |
|----:|---------------|
| P1 | Page on-call → create incident channel → assign owner → start rollback assessment within 30 min. |
| P2 | Assign owner within 2 h → fix in next hotfix → OTA push if eligible. |
| P3 | Add to weekly board → schedule next release. |
| P4 | Backlog → groomed when there is bandwidth. |

---

## Incident format (P1 only)

For every P1 we open an incident document with this structure:

1. **Summary** — one line.
2. **Impact** — who, what, when.
3. **Detection** — how we noticed (alert / tester / dashboard).
4. **Response timeline** — 5-minute resolution log.
5. **Root cause** — short.
6. **Fix** — what shipped, in which build/OTA.
7. **Prevent recurrence** — at most three actions.

We do not ship a post-mortem to testers. We do post a short release note
acknowledging the incident in the alpha channel.
