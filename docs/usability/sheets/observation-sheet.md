# Observation Sheet — In-gym Session

Print this. One sheet per session. Hand to the observer; the moderator
does not write on this.

```
SESSION
  session_id        ____________________  (uuid or A042-2026-05-13)
  tester_id         ____________________  (A### from invite sheet)
  date / start_time ____________________
  end_time          ____________________
  crew_size         1 / 2
  moderator         ____________________
  observer          ____________________
  build             ____________________  (e.g. 0.2.1 (43))
  device            ____________________
  os_version        ____________________
  gym_type          commercial / home / outdoor
  signal_quality    full / mid / poor / none

WORKOUT
  workout_day_id    ____________________  (visible in app or from logs)
  workout_type      hypertrophy / strength / fat loss / other
  exercises_done    ____________________
  workout_duration  ___ min

SEGMENT
  experience        beginner / intermediate / advanced
  goal              hypertrophy / strength / fat loss / general
  hand_dominance    right / left / ambi
  gloves            yes / no
  sweating          dry / light / heavy

CONSENT
  video             yes / no   signed at ___ : ___
  audio             yes / no
  recording_id      ____________________
```

---

## Friction log (one row per event)

Use single-letter codes. Codes are defined in
[`../FRICTION_TAXONOMY.md`](../FRICTION_TAXONOMY.md). Severity is from
[`../SCORECARD.md`](../SCORECARD.md) §2.

```
time   screen          code   sev   target / action            note (≤80 chars)
─────  ──────────────  ─────  ───   ─────────────────────────  ─────────────────────────
00:42  workout_session H      2     weight_input              2.1s eyes on screen pre-tap
01:05  workout_session M      3     set_log_button            mis-tap on edit instead
01:18  workout_session B      2     —                          back-swipe to leave keyboard
02:30  workout_session R      4     +rep_button                4 taps in 0.8s (rage tap)
02:55  workout_session T      3     rest_timer_finished       missed end signal, +12s rest
03:10  workout_session Q      2     —                          asked: "what's RIR?"
04:01  dashboard       N      1     —                          offline indicator unnoticed
06:30  history         C      4     —                          cancelled the workout
```

Code legend (full taxonomy in `FRICTION_TAXONOMY.md`):

```
H  Hesitation (≥2s eyes on screen, no action)
M  Mis-tap (tap missed target)
B  Back-track (recovery via Back / swipe-back)
R  Repeated tap / rage tap candidate
T  Timer misalignment
Q  Verbal question ("what is X?")
N  Notice failure (user did not see app feedback)
S  Scroll struggle
G  Gesture confusion (gesture not understood)
K  Keyboard problem (dismiss, cover, layout)
C  Cancel / abandon
L  Logging error (wrong rep / weight / set)
O  Offline confusion
F  Fatigue-state issue
A  Accessibility issue (contrast, target size, glare)
P  Performance issue (lag, jank, freeze)
```

---

## Scenario log

For each scenario run during §A.4 in `MODERATOR_SCRIPTS.md`:

```
scenario   started  finished  attempts  result          codes seen   note
─────────  ───────  ────────  ────────  ──────────────  ───────────  ─────────────────
#5  timer  25:10    25:48     1         success         T,H          missed first chime
#7  off    28:00    29:15     2         success-w-help  O,Q          asked if sync was lost
#12 undo   30:30    31:50     3         failed          B,M,H,Q      gave up; reset manually
```

Result values: `success`, `success-w-help` (tester needed verbal nudge),
`failed`, `skipped` (out of time).

---

## Cognitive-load notes

Free text, one line per moment of visible load. Use the cognitive
keywords from `MODERATOR_SCRIPTS.md` script B.

```
24:15  "slow, can't read this with the lights"
25:50  "wait what does superset mean here"
28:10  "where did my rest go"
```

These feed into the cognitive friction bucket regardless of where they
happened in the session.

---

## End-of-session

```
DISQUALIFIED?  yes / no   reason: ____________________
RECORDING TO REVIEW (≤3 clip refs):
  clip 1   ___:___ — ___:___   description ____________________
  clip 2   ___:___ — ___:___   description ____________________
  clip 3   ___:___ — ___:___   description ____________________

SCORECARD INPUTS (filled by analyst, not observer):
  speed_score        / 5
  clarity_score      / 5
  cognitive_score    / 5
  robustness_score   / 5
  critical_failures  count
```

Hand the sheet to the researcher within 24 hours. Sheets submitted
later than 24 hours are still logged but tagged `late=true` and weighed
half in the round scorecard.
