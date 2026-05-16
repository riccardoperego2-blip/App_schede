# Launch Documents — Index

Single entry point for the **Internal Alpha Launch** of Schede. Read in
this order:

1. **[ALPHA_LAUNCH.md](./ALPHA_LAUNCH.md)** — master playbook (phases,
   distribution, feature flags, rollout gates, launch metrics, rollback,
   implementation priorities).
2. **[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)** — gating checklist
   for every binary build and every OTA push.
3. **[TESTER_ONBOARDING.md](./TESTER_ONBOARDING.md)** — what testers
   read before installing. This is the document we link from TestFlight
   and Play Internal release notes.
4. **[TESTER_SEGMENTATION.md](./TESTER_SEGMENTATION.md)** — how we pick
   testers, target mix, personas, invite tracking.
5. **[SEVERITY_MATRIX.md](./SEVERITY_MATRIX.md)** — P1/P2/P3/P4 with
   SLAs, triage decision tree, on-call rotation.
6. **[SUPPORT_PLAYBOOK.md](./SUPPORT_PLAYBOOK.md)** — channels, daily
   routine, response macros, escalation, hotfix workflow, what support
   never does.
7. **[KPI_DASHBOARD.md](./KPI_DASHBOARD.md)** — the two dashboards
   (Reliability, Product), the SQL behind them, cadences, thresholds,
   rollback triggers, phase report template.
8. **[FEEDBACK_FORMS.md](./FEEDBACK_FORMS.md)** — weekly pulse, in-app
   form, interview script. Why we deliberately stop at three forms.

Operational glue:

- `.github/ISSUE_TEMPLATE/bug_report.yml` — tester bug report form.
- `.github/ISSUE_TEMPLATE/tester_feedback.yml` — qualitative feedback form.
- `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues, points at
  the docs above.
- `apps/mobile/src/lib/feature-flags/flags.ts` — env+OTA driven kill
  switches for already-shipped subsystems (no new infra).
- `apps/mobile/app.json` — `extra.flags` carries OTA-tunable defaults.

---

## Implementation priorities (one screen)

Already in `ALPHA_LAUNCH.md` §7, repeated here so it is the first thing
the team sees.

### P1 — before phase 0 (dogfood)

| # | Owner | What |
|--:|-------|------|
| 1 | Eng lead | EAS `preview` profile, both platforms, signed builds. |
| 2 | Eng lead | TestFlight Internal + Play Internal tracks, bot service account. |
| 3 | Eng lead | EAS Update `alpha` channel wired. |
| 4 | Eng | Analytics ingestion verified end-to-end on a real device. |
| 5 | Eng | Metabase dashboards built from `KPI_DASHBOARD.md`. |
| 6 | Eng | GitHub issue templates published (`.github/ISSUE_TEMPLATE`). |
| 7 | Eng lead | Severity matrix + on-call rota agreed in writing. |
| 8 | Product | Tester onboarding doc dry-run with 2 internal users. |
| 9 | Legal/founder | Privacy notice + in-app consent verified. |

### P2 — before phase 1 (closed alpha)

| # | Owner | What |
|--:|-------|------|
| 1 | Eng | Sentry integrated behind `analytics_enabled`. |
| 2 | Eng lead | Hotfix workflow rehearsed end-to-end (filed fake P1, fix, OTA). |
| 3 | Product | Weekly review template ready. |
| 4 | Whole team | KPI dashboard reviewed and signed off. |
| 5 | Product | First 25 testers invited. |

### P3 — before phase 2 (expanded alpha)

| # | Owner | What |
|--:|-------|------|
| 1 | Product | Interview script ready + first 3 interviews scheduled. |
| 2 | Eng | Cohort retention triangle published in Metabase. |
| 3 | Product | Support response macros agreed and saved. |
| 4 | Product | Phase 2 invite batch (75) prepared and segmentation-balanced. |

### P4 — before phase 3 (open alpha)

| # | Owner | What |
|--:|-------|------|
| 1 | Eng | Apple Phased Release / Play staged rollout configured for the GA path. |
| 2 | Product | Onboarding A/B framework reading the funnel MV (optional). |
| 3 | Product | Phase 3 invite batch (100) prepared. |
| 4 | Whole team | Beta readiness review (1 hour, signed off). |

---

## Non-goals during alpha (intentional)

- No third-party feature-flag service. The env+OTA approach is enough.
- No new product features. The alpha validates what we already shipped.
- No NPS / smiley / star-rating modals. The three feedback channels are
  deliberate.
- No public release notes. Release notes are tester-facing only.
- No app-store submission. We never leave the internal tracks during
  alpha.
- No new analytics events. Existing taxonomy (`feature.used` with
  `feature_key=feedback.submitted`) covers in-app feedback.

If any of these become blocking, we revisit during the phase retro —
not mid-phase.

---

## Done means

The alpha is "done" when **all three** are true:

1. Phase 3 phase report shows GO with all reliability thresholds green.
2. Workout retention D7 on the last cohort is ≥40%.
3. No P1 open for ≥14 days.

If we hit those, we open beta. If we do not, the team writes a one-page
"what we learned, what we change" memo, decides what to cut, and ships
phase 4 (extended alpha) — **not** a beta.
