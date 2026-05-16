import { AnalyticsTracker } from '../src/lib/analytics/tracker';
import { AnalyticsQueue } from '../src/lib/analytics/queue';
import { RageTapDetector } from '../src/lib/analytics/rage-tap-detector';
import type { AnalyticsTransport, IngestResponse } from '../src/lib/analytics/transport';
import type { AnalyticsEventEnvelope } from '../src/lib/analytics/events';

function makeTransport(): {
  transport: AnalyticsTransport;
  sent: AnalyticsEventEnvelope[][];
  setNextResponse: (resp: IngestResponse) => void;
  failNext: (error: Error) => void;
} {
  const sent: AnalyticsEventEnvelope[][] = [];
  let nextResponse: IngestResponse | null = null;
  let nextError: Error | null = null;

  const transport: AnalyticsTransport = {
    async send(batch) {
      sent.push([...batch]);
      if (nextError) {
        const err = nextError;
        nextError = null;
        throw err;
      }
      const response = nextResponse ?? {
        accepted_event_ids: batch.map((e) => e.event_id),
        rejected: [],
      };
      nextResponse = null;
      return response;
    },
  };

  return {
    transport,
    sent,
    setNextResponse: (resp) => {
      nextResponse = resp;
    },
    failNext: (error) => {
      nextError = error;
    },
  };
}

describe('AnalyticsQueue', () => {
  beforeEach(() => {
    new AnalyticsQueue().clear();
  });

  it('enqueues and lists envelopes', () => {
    const q = new AnalyticsQueue();
    q.enqueueMany([envelope('a'), envelope('b')]);
    expect(q.list()).toHaveLength(2);
    expect(q.size()).toBe(2);
  });

  it('drops oldest events on overflow', () => {
    const q = new AnalyticsQueue();
    const huge = Array.from({ length: 1_005 }, (_, i) => envelope(`e${i}`));
    const { dropped } = q.enqueueMany(huge);
    expect(dropped).toBe(5);
    expect(q.size()).toBe(1_000);
    expect(q.list()[0]?.event_id).toBe('e5');
  });

  it('acks remove events by id', () => {
    const q = new AnalyticsQueue();
    q.enqueueMany([envelope('a'), envelope('b'), envelope('c')]);
    q.ack(['a', 'c']);
    expect(q.list().map((e) => e.event_id)).toEqual(['b']);
  });
});

describe('RageTapDetector', () => {
  it('flags three taps within 800ms on the same target', () => {
    const detector = new RageTapDetector();
    let t = 0;
    expect(detector.record('complete_set', t)).toBeNull();
    expect(detector.record('complete_set', (t += 200))).toBeNull();
    const result = detector.record('complete_set', (t += 200));
    expect(result).toEqual({ target: 'complete_set', tap_count: 3, window_ms: 800 });
  });

  it('does not flag when taps are on different targets', () => {
    const detector = new RageTapDetector();
    detector.record('a', 0);
    detector.record('b', 100);
    expect(detector.record('a', 200)).toBeNull();
  });

  it('resets after detection so the next burst still detects', () => {
    const detector = new RageTapDetector();
    detector.record('a', 0);
    detector.record('a', 100);
    expect(detector.record('a', 200)).not.toBeNull();
    detector.record('a', 1000);
    detector.record('a', 1100);
    expect(detector.record('a', 1200)).not.toBeNull();
  });
});

describe('AnalyticsTracker', () => {
  let queue: AnalyticsQueue;

  beforeEach(() => {
    queue = new AnalyticsQueue();
    queue.clear();
  });

  it('flushes queued envelopes through the transport', async () => {
    const { transport, sent } = makeTransport();
    const tracker = new AnalyticsTracker({ transport, queue, flushIntervalMs: 0, batchSize: 50 });
    tracker.track({
      name: 'workout.started',
      category: 'workout',
      properties: {
        workout_day_id: 'day-1',
        plan_version_id: 'v-1',
        week_number: 1,
        is_deload_week: false,
        planned_exercise_count: 5,
        planned_set_count: 15,
        source: 'dashboard',
      },
    });
    const result = await tracker.flush('manual');
    expect(result.flushed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.[0]?.name).toBe('workout.started');
  });

  it('keeps events queued when the transport throws', async () => {
    const { transport, failNext } = makeTransport();
    const tracker = new AnalyticsTracker({ transport, queue, flushIntervalMs: 0, batchSize: 50 });
    tracker.track({
      name: 'screen.viewed',
      category: 'screen',
      properties: { screen: 'Dashboard', previous_screen: null, time_to_interactive_ms: 120 },
    });
    failNext(new Error('boom'));
    const result = await tracker.flush('manual');
    expect(result.flushed).toBe(0);
    expect(queue.size()).toBe(1);
  });

  it('does not re-send acknowledged events', async () => {
    const { transport, sent, setNextResponse } = makeTransport();
    const tracker = new AnalyticsTracker({ transport, queue, flushIntervalMs: 0, batchSize: 50 });
    tracker.track({
      name: 'feature.used',
      category: 'feature',
      properties: { feature_key: 'rest_extend_15' },
    });
    const first = queue.list()[0];
    setNextResponse({ accepted_event_ids: first ? [first.event_id] : [], rejected: [] });
    await tracker.flush('manual');
    await tracker.flush('manual');
    expect(sent).toHaveLength(1);
    expect(queue.size()).toBe(0);
  });
});

function envelope(id: string): AnalyticsEventEnvelope {
  return {
    event_id: id,
    name: 'screen.viewed',
    category: 'screen',
    properties: { screen: 'Test', previous_screen: null, time_to_interactive_ms: 0 },
    occurred_at: '2026-05-13T10:00:00Z',
    client_session_id: 'cs-1',
    app_version: '1.0.0',
    os: 'ios',
    os_version: '17.0',
    locale: 'en-US',
    schema_version: 1,
  };
}
