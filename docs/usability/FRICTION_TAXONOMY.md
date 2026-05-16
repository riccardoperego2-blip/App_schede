# Friction Taxonomy & Retention-Risk Indicators

A controlled vocabulary for friction. Observers tag events with single
letters, the analyst groups them into clusters, the backlog speaks the
same language.

We resist the urge to grow this list. New codes need (a) a recurring
phenomenon in ≥2 rounds, (b) no clean fit into an existing code, and
(c) approval at the quarterly taxonomy review.

---

## 1. Codes

### 1.1 Input / interaction

| Code | Name | Definition | Typical analytics signal |
|:---:|------|-----------|--------------------------|
| **H** | Hesitation | Eyes on screen ≥2 s without action. | Increased dwell time before `feature.used`. |
| **M** | Mis-tap | Tap landed outside intended target or hit wrong target. | Sequence of opposite actions within <1 s. |
| **R** | Rage tap / repeated tap | 3+ taps within 1 s on same target. | `ux.rage_tap` event. |
| **G** | Gesture confusion | Swipe / long-press / pinch attempted with wrong outcome. | Quick toggling of screens; back-track after gesture. |
| **K** | Keyboard problem | Keyboard covered the target, did not dismiss, or wrong type. | Multiple `screen.viewed` of the same screen within <2 s. |
| **S** | Scroll struggle | Repeated scroll past target / cannot find element. | Long screen dwell with no actionable event. |

### 1.2 Cognition / clarity

| Code | Name | Definition | Typical analytics signal |
|:---:|------|-----------|--------------------------|
| **Q** | Verbal question | "What is this?", "Where is X?". | Manual: only captured in observation sheet. |
| **N** | Notice failure | User did not see app feedback (toast, chip, state change). | App state change without user action within 3 s. |
| **B** | Back-track | Back button or swipe-back used to recover. | Reversed `screen.viewed` sequence. |
| **F** | Fatigue-state issue | Cognitive misstep visible only when the tester is tired. | Manual: from script B. |

### 1.3 System / feedback

| Code | Name | Definition | Typical analytics signal |
|:---:|------|-----------|--------------------------|
| **T** | Timer misalignment | User missed timer end or did not trust the timer. | `feature.used:rest_timer` short stops, or rest >prescribed. |
| **O** | Offline confusion | User did not understand connectivity state or sync state. | `sync.failed` within session + `screen.viewed`/rage tap. |
| **P** | Performance issue | Lag, jank, freeze, slow screen transition. | `perf.api_latency` outliers; long screen-load events. |
| **L** | Logging error | Wrong rep / weight / set captured by mistake. | Edit / undo pattern after `workout.set_completed`. |
| **A** | Accessibility issue | Contrast, target size, glare, font legibility. | Manual; analytics rarely surfaces this. |
| **C** | Cancel / abandon | User cancelled or abandoned the action. | `workout.cancelled` or screen abandonment. |

### 1.4 Reserved (no new codes without review)

`X` is reserved for *unknown* in early observation; the analyst must
replace `X` with a real code or with `noise` before the round closes.

---

## 2. Clusters

A **cluster** is a `(screen, code)` pair that appears multiple times.
Clusters, not raw events, drive the optimization backlog.

### Cluster rules

- A cluster is **named** by `screen:code` (e.g. `workout_session:R`).
- A cluster **opens** as soon as ≥3 events match across ≥2 testers.
- A cluster **promotes** to a backlog item when ≥3 testers report it
  within a round, OR when its severity ≥4.
- A cluster **closes** when 2 consecutive rounds report 0 events on it
  and the matching analytics signal drops by ≥50% week-over-week.

### Typical clusters we expect and how to read them

| Cluster | Likely cause | First check |
|---------|--------------|-------------|
| `workout_session:R` (rage tap) | Tap target too small, debounce too short, or feedback delayed. | Compare target hit zones in dev tools; review `ux.rage_tap` payload. |
| `workout_session:H` (hesitation) | Ambiguous label, unclear primary action. | Verbal questions log + interview answers. |
| `workout_session:T` (timer miss) | Notification missed, audio off, no haptic at end. | `feature.used:rest_timer` distribution; ambient noise log. |
| `onboarding:B` (back-track) | Step depends on info the user did not have. | `mv_onboarding_funnel.back_tracked` per step. |
| `dashboard:N` (notice failure) | Important chip/banner blends in. | Click heatmap on first paint, time-to-first-action. |
| `workout_session:K` (keyboard) | Number pad covers logging UI or wrong keyboard type. | Screen height vs keyboard height; field type audit. |

---

## 3. Retention-risk indicators

Subset of clusters that, when present, strongly correlate with churn.
Any event tagged with a retention-risk indicator gets its severity
bumped by one level (floor 3) per the rule in
[`SCORECARD.md`](./SCORECARD.md) §1.

### 3.1 In-session retention risks

1. **Cancellation pattern** — `workout_session:C` in ≥2 testers in a
   round. Cancelling is the strongest single predictor of churn in
   weekly cohorts.
2. **Rage tap on `+rep` / `+set` / `complete` controls** — these are
   the most-used controls; high `R` here predicts users stopping
   logging entirely.
3. **Logging errors not recoverable** — `L` followed by `B` followed
   by `Q` ("how do I fix this?"). Users who feel they cannot fix a
   mistake disengage fast.
4. **Timer missed twice in same session** — `T` ≥2. Sessions feel
   "broken" even if the prescribed work was done.
5. **Offline confusion blocking completion** — `O` followed by `C`.

### 3.2 Outside-session retention risks

6. **First-week zero workouts** — analytics: `signed_up` true and zero
   `workout.completed` in 7 days. Combined with `onboarding:B`, this is
   the dominant churn pattern in our cohort triangle.
7. **Onboarding step >60 s for ≥10% of users** — `mv_onboarding_funnel`
   tail. Slow steps predict step abandonment in subsequent rounds.
8. **PR detected = 0 by week 3** — flat progression → tester loses the
   "I am improving" signal. Cross-check with the engine, not the UI.
9. **Notification ignored 3 weeks in a row** — silent users churn even
   if they once seemed active.
10. **Diary entries with negative cognitive words** ("confused",
    "annoying", "slow", "broke") in ≥2 entries. Qualitative leading
    indicator.

### 3.3 What to do with a retention-risk indicator

The retention-risk indicator is **not** a feature ticket. It is a
**research follow-up** plus a **fix or measure** decision:

```
        retention-risk indicator
                  │
                  ▼
        next round: scenario probing it
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
     can fix now         needs more data
        │                   │
   optimization backlog   add diary prompt / probe / next round
```

We never speculate a fix from a single retention-risk indicator. We
either reproduce it once more in the next round, or we instrument it.

---

## 4. Mapping to analytics events (no new events)

These are the existing events from the warehouse + tracker. Nothing new
is introduced. The mapping lets us correlate qualitative codes with
quantitative signals over time.

| Code | Existing event(s) |
|:---:|------------------|
| H | (none directly) — proxy: time between `screen.viewed` and next `feature.used` |
| M | proxy: `feature.used` for *undo*/*edit* within 1 s of opposite action |
| R | `ux.rage_tap` |
| G | proxy: alternating `screen.viewed` within 1 s |
| K | proxy: re-emit `screen.viewed` on same screen within 2 s |
| S | proxy: dwell time on `screen.viewed` without action ≥ p95 |
| Q | (none) — observation only |
| N | proxy: state-change events with no user action within 3 s |
| B | proxy: reversed `screen.viewed` sequence |
| F | (none) — observation only (script B) |
| T | `feature.used:rest_timer` + rest >prescribed in `workout.set_completed` |
| O | `sync.failed`, `sync.dropped` near `screen.viewed` |
| P | `perf.api_latency` outliers; `perf.screen_load` p95 breaches |
| L | undo / edit events post `workout.set_completed` |
| A | (none) — observation only |
| C | `workout.cancelled` |

The proxies live in the analyst's Metabase queries; we do not need a
backend change to compute them.

---

## 5. Versioning the taxonomy

This file is **versioned** in git like any other source artifact.
Quarterly review:

- Codes added → record date, rationale, and the round that motivated it.
- Codes retired → require zero events for two quarters, and review of
  the related cluster history.
- Renames are forbidden mid-quarter. Renames make historical data
  unreadable.

Current version: **v1.0** (2026-Q2).
