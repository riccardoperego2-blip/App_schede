/**
 * Detects rage taps — three or more taps on the same target inside a short
 * window — as a UX friction signal. The detector is per-target so two
 * legitimate taps on different controls do not collide.
 */
const WINDOW_MS = 800;
const THRESHOLD = 3;

export interface RageTapEvent {
  readonly target: string;
  readonly tap_count: number;
  readonly window_ms: number;
}

export class RageTapDetector {
  private taps = new Map<string, number[]>();

  /**
   * Records a tap and returns a `RageTapEvent` when the threshold is crossed.
   * The buffer for the target is reset on detection so a single sustained burst
   * does not emit duplicate events.
   */
  record(target: string, now: number = Date.now()): RageTapEvent | null {
    const previous = this.taps.get(target) ?? [];
    const recent = previous.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    this.taps.set(target, recent);

    if (recent.length >= THRESHOLD) {
      this.taps.set(target, []);
      return { target, tap_count: recent.length, window_ms: WINDOW_MS };
    }
    return null;
  }

  reset(): void {
    this.taps.clear();
  }
}
