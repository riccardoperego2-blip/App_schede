# Support Playbook (Alpha)

Support during alpha is **engineering-led**: every tester message lands
on the same triage board, the on-call engineer reads it, classifies it,
and either replies or escalates. We do not run a dedicated support team
during alpha.

This playbook keeps response quality consistent.

---

## Channels

| Channel | Purpose | SLA |
|--------|---------|-----|
| Telegram group `schede-alpha` | bugs, sync, UX issues, real-time chatter | reply within 4 business hours |
| In-app Feedback (Profile → Feedback) | workout-quality feedback | reply within 1 business day |
| support@schede.app | account / privacy / GDPR / cannot-install | reply within 1 business day |
| TestFlight feedback / Play console | crash attachments | mirrored to bug board |
| Weekly survey | mandatory pulse | aggregated weekly, no individual reply |

All channels funnel into a single GitHub **alpha-support** board
(or Linear, if available). The on-call engineer is responsible for the
queue.

---

## Daily routine (on-call)

1. **08:30** — read the overnight Telegram channel; ack every new message.
2. **08:45** — open the bug + feedback board; triage anything new with
   the severity matrix; assign owners.
3. **09:00** — daily rollout standup (15 min).
4. **Throughout the day** — close P3/P4 with a short reply; reproduce P2
   bugs; ship hotfix-eligible OTAs.
5. **17:30** — write a one-line summary in the alpha channel: how many
   issues opened/closed, KPIs vs threshold.
6. **End of week** — write the weekly review (template in
   `KPI_DASHBOARD.md`).

---

## Response macros

Use these as starting points. Adapt the wording, but keep the structure.

### Bug acknowledged
> Thanks, logged as `BUG-####`. Could you also tell us:
> - phone model + OS version,
> - what you were doing in the 10 s before it happened,
> - if it happens every time or only once?

### Bug fixed via OTA
> Pushed a fix. Please pull-to-refresh / fully close and reopen the app,
> you should see version `x.y.z`. Let us know if it works for you.

### Bug fixed in next build
> The fix is in, but it needs a TestFlight / Play Internal update. We
> will push the new build by `<date>`. Thanks for the report.

### Cannot reproduce
> We have not been able to reproduce this yet. Would you be able to send
> a screen recording the next time it happens? Profile → Settings →
> Send diagnostics from the day of the issue is also helpful.

### Workout-quality feedback
> Thanks. We are reading every workout-quality message and feeding it
> into our weekly review. We will not reply individually but it counts
> a lot, please keep them coming.

### Account deletion (GDPR)
> Confirmed. Your account and associated data (workouts, profile,
> measurements, photos, analytics tied to your user id) will be removed
> within 14 days. We will send a confirmation email once the deletion
> job has run.

### Re-installation / sign-out
> Sign out from Profile → Sign out, then reinstall. Your data lives on
> our servers; the next time you sign in, your history will return.

### Escalation to P1
> We are treating this as a P1 incident. Please stop using the app for
> the affected flow until we ship a fix. We will keep you posted within
> 2 hours.

---

## Escalation path

```
tester report
   │
   ▼
on-call engineer  ── P3/P4 ──► close with macro
   │
   ├── P2 ─────► assigned engineer + tracked in board
   │
   └── P1 ─────► incident channel + tech lead + product
```

If on-call is unreachable, the **backup on-call** (named in the rota)
takes over. After 30 minutes with no acknowledgement on a P1, escalate
to the engineering lead directly.

---

## Hotfix workflow

The hotfix loop is meant to be **fast and boring**. Practice it once before
phase 1.

```
detect ──► triage P1/P2 ──► open hotfix branch ──► fix + test ──► OTA-eligible? ──► EAS Update on `alpha`
                                                              └─ no? ──► EAS Build preview ──► TestFlight + Play Internal
```

### OTA-eligible criteria

A fix is OTA-eligible **only if**:

- No new native module.
- No new permission.
- No native asset change (icon, splash).
- No `expo-modules-core` / Hermes upgrade.
- No analytics schema bump.

### Hotfix release notes

Always include:

- short description of the fix,
- which build/version it applies to,
- whether the user has to do anything (usually: pull-to-refresh or restart).

### Hotfix log

Keep a flat markdown log in `docs/launch/HOTFIX_LOG.md` — one entry per
hotfix with: date, severity, root cause, fix, build, owner. This is the
audit trail.

---

## Backend-side support

For backend incidents (5xx, slow API, sync issues):

- The on-call engineer checks the API latency dashboard first
  (`mv_api_latency_daily`) before assuming a client-side issue.
- For sustained 5xx, kill switches first: `analytics_enabled=false` and
  `realtime_enabled=false` via OTA. Then debug.
- DB migrations are never rolled back on a live alpha unless a P1
  data-corruption issue requires it; instead, ship a corrective forward
  migration.

---

## Feedback aggregation

Every Friday afternoon the on-call engineer (or the product lead) runs
through the in-app feedback table and the weekly survey responses, then
posts the **Top 3 themes** in the alpha channel. This:

- closes the loop with testers (they see we are reading),
- forces the team to write down what we are learning,
- feeds the weekly review.

Top-3 themes are stored in a flat doc, `docs/launch/WEEKLY_FEEDBACK_LOG.md`.
Do not over-engineer this; bullet points are enough.

---

## What support never does

- Promise a feature.
- Negotiate a deadline.
- Speculate about a root cause publicly.
- Send a build/OTA without going through the release checklist.

If a message asks for any of the above, defer politely and route to the
right channel.
