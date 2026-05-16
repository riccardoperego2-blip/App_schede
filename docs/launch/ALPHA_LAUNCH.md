# Internal Alpha Launch — Master Playbook

This document is the operating manual for the Schede internal alpha. It
is not a roadmap and does not introduce new product features. Everything
here is launch operations, validation, and damage control.

The single goal of the alpha is to **answer three questions in 6 weeks**:

1. Do real users complete real workouts with this app?
2. Do they come back?
3. Where does the experience break in real gyms?

If those answers are positive, we proceed to closed beta. If they are
not, we kill scope, not the launch.

---

## 1. Phases

The alpha is intentionally narrow. Four phases over ~6 weeks, ~200 users total.

| Phase | Duration | Audience | Goal | Exit criteria |
|-------|----------|----------|------|---------------|
| 0. Dogfood | 1 week | 5 internal | Smoke + crash sanity | 0 P1, smoke E2E green |
| 1. Closed alpha | 2 weeks | 25 friends-of-team | Validate workout completion | ≥70% W1 retention, ≥80% completion rate |
| 2. Expanded alpha | 2 weeks | +75 invited testers | Validate retention + adherence | ≥40% W2 retention, ≥0.7 avg adherence |
| 3. Open alpha | 1+ week | +100 from waitlist | Validate scale + onboarding | ≥35% activation in 7d, crash-free ≥99.5% |

Each phase needs an explicit go/no-go review before opening the next.
"No-go" means we hold, fix the blocker, then continue — not ship anyway.

### Phase entry checklist

Every phase needs the same checklist green:

- [ ] Smoke E2E green on the last build (Maestro `tag:smoke`).
- [ ] No open P1 or P2 bugs (see severity matrix).
- [ ] Crash-free sessions ≥99% in the previous phase.
- [ ] Sync failure rate ≤5% in the previous phase.
- [ ] Reliability dashboards loaded with last-7-day data.
- [ ] Support inbox triaged to zero pending P1/P2 within 24h.

---

## 2. Distribution

We do not ship to the App Store / Play Store during alpha. Distribution
is internal-track only.

### iOS

- **TestFlight Internal Testing** for phases 0–1 (up to 100 testers).
- **TestFlight External Testing** for phases 2–3 (review required once).
- Build via `eas build --profile preview --platform ios`.
- Ship via `eas submit --profile preview --platform ios`.
- Each TestFlight build keeps an explicit `What to test` note pointing to
  the latest [TESTER_ONBOARDING.md](./TESTER_ONBOARDING.md) section.

### Android

- **Google Play Internal Testing** track for all phases.
- Build via `eas build --profile preview --platform android`.
- Ship via `eas submit --profile preview --platform android` after Play
  Console internal-track setup is done.
- Testers receive a one-tap opt-in link.

### Over-the-air JS updates

- **EAS Update channel `alpha`** carries JS-only patches between native
  builds. Bug fixes that do not require a binary go through Update.
- Updates inherit the binary version, so the `schema_version` in
  analytics envelopes stays correct.

### Build matrix (one binary per phase, OTA in between)

| Build | Channel | Distribution | Update channel |
|-------|---------|--------------|----------------|
| alpha-0.1.0 | `alpha` | TestFlight Internal + Play Internal | `alpha` |
| alpha-0.1.x (hotfix) | `alpha` | EAS Update only | `alpha` |
| alpha-0.2.0 | `alpha` | TestFlight Internal/External + Play Internal | `alpha` |

Native rebuilds happen only when native deps change, the app icon
changes, or a JS-only fix is not enough (e.g. permissions).

---

## 3. Feature flags & kill switches

The alpha is small enough that we do **not** introduce a third-party
feature-flag service. Flags live in `apps/mobile/src/lib/feature-flags/flags.ts`
and are driven by:

1. `EXPO_PUBLIC_FLAG_*` env vars at build time (per channel via `eas.json`).
2. `Constants.expoConfig.extra.flags` overrides per OTA update (no rebuild).

This gives us per-channel toggles without a backend dependency. The
backend itself can disable risky paths through the same env mechanism
on the NestJS side.

Allowed alpha flags (initial set, no new product surfaces):

| Flag | Purpose |
|------|---------|
| `analytics_enabled` | Kill switch for telemetry SDK |
| `realtime_enabled` | Kill switch for Supabase Realtime channels |
| `offline_queue_enabled` | Kill switch for the offline mutation queue |
| `circuit_breaker_enabled` | Disable per-endpoint breakers if false-positive |
| `keep_awake_default` | Default for keep-screen-awake during workout |

Flags **never** gate user-visible features in alpha. They only exist to
turn off subsystems we already shipped, in case something misbehaves.
The full backend feature-flag service is post-MVP.

---

## 4. Rollout strategy and gates

Rollout is by **invitation list**, not by percentage. Each phase has an
explicit invite list managed in a shared sheet.

```
Phase 1 invites:    25  ✅ confirmed signed up
Phase 2 invites:    75  (sent at phase 1 + 14d, gated on phase exit)
Phase 3 invites:   100  (from waitlist, prioritized by segment fill)
```

### Daily rollout meeting (15 min)

For the duration of the alpha:

- Crash-free sessions yesterday vs threshold (99%).
- Sync failure rate yesterday vs threshold (5%).
- Top three open issues from triage.
- Any user message escalated overnight.
- Decision: ship pending hotfix? Block phase escalation?

### Weekly review (45 min)

- Retention curve update (D1/D7/D30 by phase).
- Adherence distribution (green/yellow/red).
- Activation rate trend.
- Tester feedback themes (top 3 from forms / interviews).
- Decision: open the next phase? Hold? Roll back?

---

## 5. Launch metrics (validation framework)

Metrics are split between **outcome KPIs** (do users get value?) and
**reliability KPIs** (does the app survive use?). Each has a threshold;
below the threshold the phase does not progress.

### Outcome KPIs

| Metric | Source | Phase 1 target | Phase 2 target | Phase 3 target |
|--------|--------|----------------|----------------|----------------|
| Activation (signup → first workout in 7d) | `mv_activation` | ≥60% | ≥50% | ≥35% |
| W1 retention (signup-week cohort) | `mv_weekly_cohort_retention` | ≥70% | ≥55% | ≥40% |
| W2 retention | same | ≥45% | ≥40% | ≥30% |
| Workout completion rate | `mv_workout_dropoff.completion_rate` | ≥85% | ≥80% | ≥75% |
| Avg workout adherence | `mv_weekly_adherence.avg_adherence_score` | ≥0.80 | ≥0.75 | ≥0.70 |
| Sessions per user per week | derived | ≥2 | ≥2 | ≥1.8 |
| Onboarding completion | `mv_onboarding_funnel` | ≥80% | ≥75% | ≥70% |

These thresholds are deliberately tightened in early phases (fewer, more
motivated users) and relaxed as we expand. Drops outside the band by
>20% trigger an immediate review.

### Reliability KPIs

| Metric | Source | Threshold |
|--------|--------|-----------|
| Crash-free sessions | client events + Sentry (P2) | ≥99% (alarm), ≥99.5% (target) |
| Sync failure rate | `mv_sync_health_daily` | ≤5% (alarm), ≤2% (target) |
| API p95 (`/workouts/complete`) | `mv_api_latency_daily` | ≤800 ms |
| API p95 (`/workouts/today`) | same | ≤500 ms |
| API p95 (`/dashboard/summary`) | same | ≤500 ms |
| Rage taps per active user per session | `mv_rage_taps` | ≤0.5 |
| Time-to-interactive (Dashboard) p95 | `perf.screen_load` | ≤1.5 s |
| Time-to-interactive (Workout) p95 | same | ≤2 s |

### Onboarding success metrics

- Onboarding completion rate per phase (target ≥75%).
- Median time on each step (alarm if any step >60s for ≥10% of users).
- Back-track ratio per step (alarm if >20%).
- Drop-off step (the step with the highest delta `viewed - completed`).

### Retention evaluation framework

We score retention against a comparison band, not a single number.
For each weekly cohort we record:

- D1, D7, D14, D30 retention (single workout or session).
- D7, D14 **workout retention** (a return is counted only if it is a
  completed workout, not just an app open). This is the metric we care
  about.

Cohorts are stored in `mv_weekly_cohort_retention`; a simple Metabase
dashboard plots them as a triangle. We exit alpha only if the
**workout retention** D7 is ≥40% in the last cohort.

---

## 6. Rollback triggers

Hard triggers — automatic rollback (revert OTA, pause native rollout)
within 2 hours:

- Crash-free sessions <97% in the last 24h.
- Sync failure rate >10% in the last 24h.
- API 5xx rate on `/workouts/complete` >1% in the last 24h.
- A P1 issue confirmed reproducible.
- Data integrity event (duplicate side effect, lost set).

Soft triggers — discuss, decide within 24h:

- Activation drop >20% phase-over-phase.
- W1 retention drop >15pp phase-over-phase.
- Workout completion rate <70%.
- Negative qualitative feedback theme in ≥3 interviews.

Rollback procedure:

1. EAS Update: republish the previous bundle (`eas update --republish --channel alpha`).
2. App Store / Play Console: pause phased release / staged rollout.
3. Communication: send TestFlight `What to test` note + Slack alpha
   channel announcement.
4. Backfill: file the bug as P1 in the triage system, owner assigned.

---

## 7. Implementation priorities

The alpha launch does not need new features. It needs the following
operational pieces ready, in order:

### P1 — before phase 0

1. EAS preview profile builds working on both platforms.
2. TestFlight + Play Internal tracks configured with bot service account.
3. `alpha` EAS Update channel wired.
4. Analytics ingestion live and verified end-to-end on a test device.
5. Reliability dashboards (Metabase) bookmarked and refresh schedule on.
6. Bug + feedback issue templates published in GitHub.
7. Severity matrix and on-call rota agreed.
8. Tester onboarding doc written, dry-run on internal users.
9. Privacy notice + consent prompt verified.

### P2 — before phase 1

1. Sentry integrated behind the `analytics_enabled` flag.
2. Hotfix workflow rehearsed end-to-end (file a fake P1, fix, OTA push).
3. Weekly review template ready in Notion / docs.
4. KPI dashboard reviewed by the team and signed off.

### P3 — before phase 2

1. Tester interview script ready.
2. Cohort retention triangle visual published.
3. Support response macros agreed.

### P4 — before phase 3

1. Onboarding flow A/B framework reading the funnel MV (optional).
2. Apple Phased Release / Play staged rollout configured for the GA path.

---

## 8. File map

```
docs/launch/
  ALPHA_LAUNCH.md            ← this file
  RELEASE_CHECKLIST.md       per-release gating
  TESTER_ONBOARDING.md       what testers must do, and not do
  SUPPORT_PLAYBOOK.md        triage + macros + escalation
  SEVERITY_MATRIX.md         P1..P4 with SLAs
  KPI_DASHBOARD.md           Metabase queries + cadence
  FEEDBACK_FORMS.md          weekly survey + interview script

.github/ISSUE_TEMPLATE/
  bug_report.yml             internal + tester bug template
  tester_feedback.yml        structured qualitative feedback

apps/mobile/src/lib/feature-flags/
  flags.ts                   env-driven kill switches, no new infra
```
