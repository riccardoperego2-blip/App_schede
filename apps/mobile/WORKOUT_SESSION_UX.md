# Workout Session UX System

This document defines the production UX for the workout session screen. The goal is not to create a flashy mockup. The goal is a fast, low-friction, gym-proof interaction system for users with sweaty hands, limited attention, one free thumb, and increasing fatigue.

The current implementation already has the right technical base: a modal route, persisted Zustand workout draft, inline set rows, rest timer, keep-awake support, and offline completion. The UX system below tightens those primitives into a premium but practical training experience.

## Product Principles

The session screen has one job: help the athlete complete the planned work with the least possible cognitive and physical friction.

Primary principles:

- One-thumb first. Every high-frequency action must be reachable in the lower half of the screen.
- Logging should be one or two taps after the first set. Inputs must be pre-filled from the prescription or previous set.
- The app must never block training because the network is missing.
- The UI should get calmer as fatigue increases, not more complex.
- The athlete should always know three things: what set is next, what load/reps are expected, and whether the session is on track.
- Advanced actions must be available but secondary: notes, pain, substitutions, RPE, warmup customization, supersets.

Non-goals:

- No decorative gym dashboard.
- No dense tables during training.
- No forced modal for every set.
- No long animations.
- No mandatory typing when a stepper or previous-value default is enough.

## UX Architecture

The session uses a narrow hierarchy:

1. Session status header
2. Rest timer, only when active
3. Current / next exercise region
4. Exercise cards with set rows
5. Sticky bottom action zone
6. Completion sheet

The user should be able to train mostly from the lower 45% of the screen. Header controls exist, but repeated actions live near the thumb.

Recommended screen zones:

- Top safe zone: elapsed time, pause, cancel, offline/sync indicator.
- Middle scan zone: exercise cards, target context, coach cues.
- Bottom action zone: complete set, next exercise, finish session, keyboard accessory.

## Screen Hierarchy

### Session Header

Always visible:

- Elapsed time
- Pause / resume
- Cancel with confirmation
- Offline queued indicator when needed

Should not dominate the screen. The athlete glances at it, they do not operate from it repeatedly.

Header states:

- Running: elapsed time + pause button
- Resting: elapsed time + compact rest hint if timer is offscreen
- Paused: obvious paused banner and large resume CTA
- Offline: subtle “Offline, saving locally” pill
- Sync pending after finish: “Queued for sync” confirmation

### Rest Timer Region

The rest timer should appear directly below the header and never fully block logging.

Primary actions:

- `+15s`
- `Skip`
- `Start next set` when remaining time is under 10 seconds

Behavior:

- Starts automatically after completing a working set.
- Uses a short haptic on start and a stronger haptic at zero.
- Can be adjusted without interrupting current input.
- If the user scrolls away, a compact sticky mini timer appears at top or bottom.

Avoid:

- Full-screen timer by default.
- Loud visual effects.
- Forcing the user to wait until zero before logging.

### Exercise List

Exercise cards are stacked, but only the active exercise should feel visually dominant.

Card states:

- Upcoming: collapsed summary
- Active: expanded, highest contrast
- Completed: collapsed with completion check and set count
- Superset: grouped card with A1/A2 labels
- Problem state: pain, missed target, skipped set, substitution suggested

The list should auto-advance focus to the next unfinished set but never force scroll jumps after the user manually scrolls.

## Exercise Card UX

Each exercise card should answer:

- What am I doing?
- What is the target?
- How many sets are left?
- What is the fastest next action?

Recommended card content:

- Exercise name
- Target muscle or movement pattern
- Set progress, for example `2/4 set`
- Rest prescription
- Optional tiny coach cue: “Keep 1-2 RIR”
- Set rows
- Secondary actions behind a menu: notes, replace, skip, add warmup, add set

Active exercise layout:

- Header tap collapses / expands.
- Swipe left reveals secondary actions: Replace, Note, Skip.
- Long press opens exercise details and previous performance.
- Completed card collapses automatically after a brief success state.

Avoid showing too much biomechanical metadata during the session. The backend uses that data; the athlete needs only the cue that changes execution.

## Set Logging UX

The set row is the most important component.

Default row fields:

- Set number
- Load
- Reps
- Complete button

Secondary fields:

- RPE / RIR
- Pain score
- Notes
- Failure reason

These secondary fields should be hidden by default and revealed only when needed.

### Fast Path

Ideal flow:

1. User sees load/reps pre-filled.
2. User changes reps only if different.
3. User taps complete.
4. Rest timer starts.

For repeated sets, the app should carry forward:

- Last load
- Last reps if target range is unchanged
- Last RPE as a hint, not a pre-filled required field

### Quick Weight Input

Weight input must not require precise typing every time.

Recommended controls:

- Tap load field to edit with numeric keyboard.
- Horizontal stepper controls: `-2.5`, `+2.5`, with long press for repeated changes.
- Quick chips from recent loads: previous set, planned load, last session load.
- Unit-aware increments: default 2.5 kg, configurable to 1.25 kg, 5 lb, or machine increments.

Keyboard behavior:

- Use decimal pad for load.
- Use number pad for reps.
- Keep the active set visible above keyboard.
- Add an input accessory row: `-2.5`, `+2.5`, `Done`.
- Never let the sticky bottom CTA cover the active input.

### Completion Button

Minimum size: 48x48 px, ideally 52-56 px.

States:

- Idle: neutral surface
- Ready: accent surface when reps > 0
- Complete: accent filled with confirmation
- Error: gentle shake only when trying to complete with missing reps

The button should be on the right for right-thumb reach. Left-handed mode can mirror it later, but MVP should optimize for the majority and maintain predictable layout.

## Supersets UX

Supersets should not look like separate unrelated exercises. They are one training block.

Recommended model:

- One `SupersetBlockCard`
- Exercises labeled `A1`, `A2`, optionally `A3`
- Shared round progress: `Round 2/4`
- Each exercise has its own compact set row inside the round
- Rest timer starts after the full round, not after each exercise, unless prescribed otherwise

Superset interaction flow:

1. Log A1 set.
2. App auto-focuses A2.
3. Log A2 set.
4. Round marked complete.
5. Rest timer starts.
6. Next round opens.

Edge cases:

- User skips A2 due to equipment occupied: allow “Delay A2” and keep round incomplete.
- User completes A2 before A1: allow but show round order warning only once.
- Different loads per round: preserve each exercise independently.

## Warmup UX

Warmups should reduce injury risk without adding friction.

Warmup presentation:

- Collapsible warmup section above working sets.
- Default hidden when completed.
- Label warmups clearly: `Warmup`, not `Set 0`.
- Warmup sets do not count toward adherence or working volume unless backend marks them as productive.

Warmup controls:

- `Add warmup`
- `Generate warmups from working load`
- `Skip warmups today`

Smart defaults:

- Strength / powerlifting: more warmup visibility.
- Hypertrophy machine/isolation: compact warmup.
- Beginner: fewer fields, more cues.
- Advanced: allow custom warmup ladders.

## Failure, Retry, and Pain UX

Failure should not feel like a punishment. It is data for the adaptive engine.

When user misses target:

- Do not interrupt immediately.
- Mark the set subtly as “Below target”.
- At exercise end, ask a one-tap reason if needed:
  - Too heavy
  - Fatigue
  - Pain
  - Technique
  - Equipment

Pain flow:

- Pain score can be opened from a set row.
- If pain score >= 4, show “Log pain and continue?” with options:
  - Continue
  - Reduce load
  - Replace exercise
  - Stop exercise

Retry flow:

- Completed set can be undone for 5-8 seconds via inline undo.
- After that, editing remains possible but not prominent.
- If user accidentally finishes workout, completion screen has “Resume session” until sync starts.

## Offline UX

Offline should be calm, not alarming.

During session:

- Show a small pill: “Offline, saving locally”.
- Do not block set logging.
- Do not show repeated alerts.

At completion:

- If network works: normal success.
- If network fails: “Workout saved offline. We’ll sync automatically.”
- Show queued count in profile/settings.
- Keep idempotency key tied to workout day and completion timestamp.

Failure after replay:

- Retryable: remain queued with next attempt.
- Non-retryable: surface in a “Needs review” state, not during training.

## Gesture Interactions

Gestures must be optional accelerators, not required controls.

Recommended:

- Swipe exercise card left: replace, skip, note.
- Swipe set row left: undo, mark pain, delete added set.
- Long press load: quick load picker.
- Long press complete: complete and skip rest.
- Pull down in modal: ask before discarding active session.

Avoid:

- Hidden-only gestures.
- Complex multi-finger gestures.
- Swipe actions on tiny rows without a visible fallback.

## Haptics Strategy

Use haptics as confirmation, not decoration.

Recommended mapping:

- Complete set: light impact
- Rest starts: selection
- Rest ends: medium impact or notification haptic
- PR detected after completion: success haptic
- Validation error: warning haptic
- Dangerous action confirmation: no haptic until confirmed

Respect `settings.hapticsEnabled`.

Avoid haptics on every keystroke or scroll.

## Animation Strategy

Animations should be short, purposeful, and interruptible.

Durations:

- Set complete state: 120-180 ms
- Card collapse/expand: 180-240 ms
- Rest timer appear/disappear: 160-220 ms
- Finish sheet slide: 220-280 ms

Use animation only for:

- Preserving spatial continuity
- Confirming completion
- Moving focus to next set
- Showing a state transition

Avoid:

- Bouncy animation while fatigued
- Long progress animations
- Decorative confetti during the session

Implementation:

- Use Reanimated for card layout and bottom sheet transitions.
- Use native driver compatible transforms/opacity.
- Keep timers state-driven and avoid rerendering the full list every tick.

## Accessibility Strategy

The screen must work for low vision, fatigue, tremor, and noisy environments.

Requirements:

- Minimum 48x48 px touch target for repeated actions.
- Text contrast meets WCAG AA.
- Dynamic type support for labels and key values.
- `accessibilityRole="button"` on pressables.
- `accessibilityLabel` for set complete: “Complete set 2 of Bench Press”.
- `accessibilityHint` for destructive actions.
- Do not rely on color alone; use text states like “Done”, “Below target”.
- Screen reader order follows training order.
- Rest timer announces at important thresholds only: start, 10 seconds, done.

Reduced motion:

- Respect system reduced motion.
- Replace transitions with instant state changes plus haptic/audio-safe feedback.

Large text mode:

- Set row can stack load/reps vertically.
- Sticky CTA remains full width.
- Secondary metadata truncates before primary values.

## Live Progression Feedback

Live feedback should be supportive and sparse.

Useful feedback:

- “On target” after matching planned reps/load.
- “Top of range reached” when next load increase is likely.
- “Below target today” after repeated misses, without shaming.
- “PR possible” only when obvious and not distracting.

Do not show complex progression math mid-set. Save detailed adaptation feedback for post-workout.

Recommended moments:

- After completing a set: inline microcopy for 2-3 seconds.
- At exercise completion: small summary.
- At workout completion: backend adaptation summary.

## Adherence Feedback

During training:

- Show simple progress: completed sets / planned sets.
- Do not penalize skipped warmups.
- Do not show adherence percentage constantly unless user opens summary.

At completion:

- Show adherence as plain language:
  - “Full session completed”
  - “Most planned work completed”
  - “Partial session saved”

Use the numeric adherence value for the backend, not as the primary athlete-facing label.

## Completion Flow

Completion must be confident and short.

Flow:

1. User taps “Finish session”.
2. Bottom sheet opens with:
   - Completed set count
   - Estimated volume
   - Session duration
   - Sleep, soreness, fatigue inputs
   - Optional session RPE
3. User confirms.
4. App saves online or queues offline.
5. Success screen or toast:
   - PRs
   - Readiness signal
   - Next workout hint

The completion sheet should be skippable only if required backend fields already have defaults. The app can default sleep/soreness/fatigue to neutral values but should encourage explicit input.

## Fatigue-Aware Interaction Design

The UI should assume the user becomes less precise over time.

Design rules:

- Increase reliance on defaults after first exercise.
- Keep primary actions in stable positions.
- Do not move the complete button around.
- Avoid presenting new choices late in the workout.
- Use progressive disclosure for corrections.
- Use short labels and numeric values.
- Prefer tap targets over text links.

Late-session state:

- Show fewer suggestions.
- Collapse completed exercises.
- Keep finish CTA visible.
- Use calm language: “Save partial session” instead of “You missed sets”.

## Component Breakdown

Recommended next components:

- `SessionHeader`
- `OfflineStatusPill`
- `MiniRestTimer`
- `RestTimerPanel`
- `ExerciseCard`
- `SupersetBlockCard`
- `SetRow`
- `QuickWeightInput`
- `RepsInput`
- `RpeInput`
- `PainScoreSheet`
- `FailureReasonSheet`
- `WarmupSection`
- `StickySessionActionBar`
- `CompletionSheet`
- `ProgressionFeedbackBanner`
- `WorkoutResumeBanner`

Existing components to evolve:

- `WorkoutSessionScreen` becomes orchestration only.
- `ExerciseCard` should split header, set list, and actions.
- `SetRow` should extract `QuickWeightInput` and `RepsInput`.
- `RestTimer` should add compact and expanded variants.
- `FinishSheet` should become a bottom sheet pattern rather than inline card.

## React Native Implementation Strategy

State:

- Keep live draft in `workout-session.store.ts`.
- Add derived selectors:
  - `nextUnfinishedSet`
  - `activeExerciseProgress`
  - `sessionProgressLabel`
  - `isSessionCompleteEnough`
  - `hasPainFlags`
  - `missedTargetSets`

Rendering:

- Use `FlashList` or optimized `FlatList` if exercise count grows.
- Memoize `ExerciseCard` and `SetRow`.
- Timer should update only timer component, not entire session screen.
- Use stable callbacks for set updates.

Input:

- Use controlled text inputs for active fields only.
- Debounce persistence if needed, but do not debounce visual updates.
- Add keyboard accessory controls for load increments.

Motion:

- Reanimated for collapse, completion pulse, bottom sheet.
- Respect reduced motion.

Persistence:

- Persist draft continuously via Zustand/MMKV.
- Queue completion via existing `offlineQueue`.
- Use idempotency key for every finish attempt.

## Edge Cases

Session state:

- App killed mid-session: restore draft and show “Resume workout”.
- User opens another day while session active: ask to resume, discard, or save partial.
- Timer expires in background: recalculate from `restEndsAt`, do not rely on interval.
- Device time changes: derive with server-neutral timestamps where possible and tolerate drift.

Logging:

- User completes set with reps missing: inline warning, no full-screen alert.
- User enters impossible value: clamp or warn based on field type.
- User changes planned load after completing set: preserve completed actual value.
- User adds sets: mark as extra, include in backend payload as completed work.
- User removes added set: allow immediately; planned set removal should require confirmation.

Gym realities:

- Equipment occupied: allow “delay exercise” or “replace”.
- Superset interrupted: allow partial round.
- Machine stack increments differ: allow per-exercise load increment memory.
- User forgets to start workout and logs later: support manual completedAt.
- User has wet hands: large touch targets, no tiny swipe-only actions.

Offline:

- Network unavailable at start: load cached plan.
- Network unavailable at finish: queue completion.
- Auth token expired while offline: keep queue; replay after auth refresh.
- Queue replay receives validation error: mark as needs review, do not delete silently unless payload is unrecoverable.

## Gym Real-World Scenarios

Heavy compound day:

- User needs large controls, rest timer, and minimal distractions.
- Show target load/reps and RPE cue.
- Defer progression feedback until exercise end.

High-volume hypertrophy:

- Repeated sets need carry-forward values.
- Completion must be one tap.
- Rest timer should be compact and non-blocking.

Crowded gym:

- Replacement and delay controls must be available quickly.
- Backend substitution can be requested after session if immediate replacement is not implemented yet.

Beginner user:

- More cues, fewer fields.
- Hide RPE/RIR unless plan requires it.
- Use plain language: “Leave 2 reps in reserve” rather than “RIR 2”.

Advanced user:

- Faster controls, custom warmups, top-set/backoff support.
- RPE field accessible but not mandatory for every set.

## Performance Considerations

- Timer should not rerender every set row.
- Avoid storing derived values in state; compute with selectors.
- Keep `TextInput` count reasonable by rendering only expanded exercise rows.
- Use `removeClippedSubviews` only after testing with inputs.
- Avoid heavy chart/analytics components in the session route.
- Keep haptics fire-and-forget.
- Persist draft with MMKV, not AsyncStorage.

## Touch Ergonomics

Minimums:

- Primary CTA: 56px height
- Complete set button: 48-56px square
- Rest controls: 44px minimum
- Swipe action reveal width: 72-96px
- Text input height: 44-48px

Thumb zone:

- Sticky bottom CTA.
- Complete buttons on the right.
- Rest controls near lower or middle region when active.
- Destructive actions away from primary thumb path and confirmed.

Spacing:

- 8-12px between repeated row controls.
- 16-20px card padding.
- 20-24px bottom safe-area padding above home indicator.

## Premium UX Patterns

Premium here means reliable, calm, and fast.

Patterns:

- Instant local response for every tap.
- Subtle haptics instead of visual noise.
- Calm recovery from offline state.
- Clear persistence after app restart.
- No shaming language.
- Coach-like feedback at the right time, not during maximal effort.
- Consistent surfaces and touch geometry.

## Implementation Priorities

Priority 1:

- Inline set row improvements: ready state, 48-56px complete button, no full alert for missing reps.
- Extract `SessionHeader`, `StickySessionActionBar`, `RestTimerPanel`.
- Add compact offline pill.
- Add resume workout banner on dashboard.

Priority 2:

- Quick weight input with stepper and input accessory.
- Mini rest timer when timer scrolls offscreen.
- Failure reason and pain sheet.
- Finish sheet as bottom sheet.

Priority 3:

- Warmup section and generated warmup ladder.
- Superset block card.
- Live progression feedback.
- Replacement/delay flow.

Priority 4:

- Wearable integration.
- Left-handed layout option.
- Per-exercise load increment preferences.
- Full accessibility audit with screen reader testing.

## Wearable / Watch Integration

MVP watch companion should be intentionally small:

- Show current exercise and set.
- Complete set.
- Start/skip rest.
- Display rest countdown.
- Show next set target.

Do not put load editing or exercise replacement on watch in v1. The watch is for confirmation and timing, not complex entry.

Future:

- Apple Watch Live Activity / WorkoutKit integration.
- Heart rate as optional readiness signal.
- Haptic rest-end on watch.
- Voice dictation for quick notes.

