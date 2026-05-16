# Release Checklist (Alpha)

Use this checklist for **every** binary build pushed to TestFlight or
Play Internal, and a slimmer version for every EAS Update OTA push.

If any item is missing, the release does not ship.

---

## A. Pre-build (engineering)

- [ ] `main` is green: backend CI, mobile CI, Maestro smoke flow.
- [ ] No P1/P2 issues open against the release scope.
- [ ] DB migrations applied to alpha environment; rollback script reviewed.
- [ ] `apps/mobile/app.json` `version` bumped (semver).
- [ ] `apps/mobile/app.json` `ios.buildNumber` and `android.versionCode` bumped.
- [ ] `apps/mobile/app.json` `extra.flags` matches phase-targeted flags.
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to alpha backend.
- [ ] `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` correct for alpha project.
- [ ] Sentry release tag matches build identifier (if Sentry enabled).
- [ ] Analytics `schema_version` bumped if event shape changed.

## B. Build (CI)

- [ ] `eas build --profile preview --platform ios` succeeds.
- [ ] `eas build --profile preview --platform android` succeeds.
- [ ] Build artifacts archived to release log (URL pinned).
- [ ] Source map upload step succeeded (so crashes symbolicate).

## C. Smoke validation (manual, 1 device per OS)

Use a real iPhone and a real low-end Android (2GB RAM target). Sign in
with a fresh alpha account.

- [ ] Cold start under 2 s on iPhone, under 3 s on low-end Android.
- [ ] Onboarding completes (`onboarding_completed` event fires).
- [ ] Dashboard renders today’s workout.
- [ ] Start workout → complete one set → see live progress.
- [ ] Kill app mid-workout → reopen → draft restored.
- [ ] Toggle airplane mode → complete workout → restore connectivity → flush succeeds.
- [ ] No rage taps in 1-minute walkthrough on the workout screen.
- [ ] Sign-out + sign-in works.

## D. Release artifacts

- [ ] TestFlight `What to test` notes filled (point at TESTER_ONBOARDING.md).
- [ ] Play Internal release notes filled (same content).
- [ ] Known-issues section attached to the release notes.
- [ ] Internal Slack alpha channel announcement drafted.

## E. Submit & enable

- [ ] `eas submit --profile preview --platform ios` finished.
- [ ] `eas submit --profile preview --platform android` finished.
- [ ] Build promoted to TestFlight testers (selected groups only for this phase).
- [ ] Build promoted to Play Internal track (selected list).
- [ ] Slack announcement posted.

## F. Post-release (first 24 h)

- [ ] Crash-free sessions ≥99% (Sentry + analytics).
- [ ] Sync failure rate ≤5%.
- [ ] API p95 for `/workouts/complete` ≤800 ms.
- [ ] No P1 reported.
- [ ] Reliability dashboard reviewed during daily standup.

If any post-release threshold breaches, trigger the **Rollback procedure**
in `ALPHA_LAUNCH.md` §6.

---

## OTA-only (EAS Update) checklist

Use this slimmer flow for JS-only fixes that do not require a native build.

- [ ] Change does not require new native code (no new permissions, no new modules).
- [ ] Change does not alter analytics `schema_version`.
- [ ] `main` green; Maestro smoke green.
- [ ] Source map uploaded for Sentry.
- [ ] `eas update --branch alpha --message "fix: <id> <short>"` succeeded.
- [ ] Verified on at least one device by pulling the update.
- [ ] Slack alpha channel announcement (single line).
- [ ] Issue closed in the triage tool with the EAS update id.

## DB migration sub-checklist

Run before any release that includes new SQL migrations:

- [ ] Migration runs forward against alpha DB.
- [ ] Backward script (`down`) drafted; tested where feasible.
- [ ] Materialized view refresh path still valid.
- [ ] RLS policies updated and reviewed.
- [ ] Analytics MV refresh schedule unaffected.
