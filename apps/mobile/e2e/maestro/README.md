# Maestro E2E flows

These flows are the gatekeeper for releases. They run against a real build
(EAS preview channel) on iOS and Android. Each flow has a single hypothesis;
adding extra steps weakens it.

## Setup

```bash
brew install maestro
# or: curl -Ls "https://get.maestro.mobile.dev" | bash

cp .env.maestro.sample .env.maestro     # fill in test account credentials
maestro test --env-file .env.maestro apps/mobile/e2e/maestro
```

## Tagging

- `tag:smoke` — must pass on every PR (CI gate).
- `tag:nightly` — runs on nightly schedule.
- `tag:release` — runs on release candidate builds.

## Required device states

Some flows require simulating offline. On real devices we toggle airplane
mode through Maestro `runFlow` helpers (`device:offline.yaml`). On iOS
simulators the `Network Link Conditioner` profile `100% Loss` works.

## Flow inventory

| File | Hypothesis | Tag |
|------|------------|-----|
| `smoke.yaml` | Sign in → start → complete one set → finish, online | smoke |
| `offline-workout.yaml` | Full session can be completed and queued offline | release |
| `resume-after-kill.yaml` | Force-quit during workout restores the draft | nightly |
| `rage-tap-protection.yaml` | Repeated tap on Complete Set does not duplicate | release |
| `auth-expiration.yaml` | Expired access token is refreshed transparently | nightly |
