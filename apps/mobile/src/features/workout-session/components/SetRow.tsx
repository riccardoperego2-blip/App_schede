import { memo } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Text } from '../../../design-system';
import type { SetDraft } from '../../../stores/workout-session.store';

interface SetRowProps {
  set: SetDraft;
  onUpdate: (patch: Partial<SetDraft>) => void;
  onComplete: () => void;
}

function SetRowImpl({ set, onUpdate, onComplete }: SetRowProps) {
  const target = `${set.targetRepsMin}–${set.targetRepsMax}`;
  const intensityLabel =
    set.targetRpe != null
      ? `RPE ${set.targetRpe}`
      : set.targetRir != null
        ? `RIR ${set.targetRir}`
        : null;

  return (
    <View
      className={`gap-2 rounded-card border p-3 ${
        set.completed ? 'border-accent/30 bg-accent/10' : 'border-border-soft bg-bg-surface'
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-bg-glass">
          <Text variant="caption">{set.setIndex}</Text>
        </View>
        <View className="flex-1 flex-row items-center gap-2">
          <View className="flex-1">
            <Text variant="tiny" tone="muted">
              CARICO KG
            </Text>
            <TextInput
              value={set.loadKg != null ? String(set.loadKg) : ''}
              onChangeText={(text) => {
                const parsed = parseFloat(text.replace(',', '.'));
                onUpdate({ loadKg: Number.isFinite(parsed) ? parsed : null });
              }}
              keyboardType="decimal-pad"
              placeholder={set.targetLoadKg ? String(set.targetLoadKg) : '—'}
              placeholderTextColor="#6B7585"
              editable={!set.completed}
              className="h-10 rounded-xl border border-border-soft bg-bg-glass px-3 text-text-primary"
            />
          </View>
          <View className="flex-1">
            <Text variant="tiny" tone="muted">
              REPS · {target}
            </Text>
            <TextInput
              value={set.completedReps > 0 ? String(set.completedReps) : ''}
              onChangeText={(text) => {
                const parsed = parseInt(text, 10);
                onUpdate({ completedReps: Number.isFinite(parsed) ? parsed : 0 });
              }}
              keyboardType="number-pad"
              placeholder={target}
              placeholderTextColor="#6B7585"
              editable={!set.completed}
              className="h-10 rounded-xl border border-border-soft bg-bg-glass px-3 text-text-primary"
            />
          </View>
        </View>
        <Pressable
          onPress={onComplete}
          disabled={set.completed}
          className={`h-10 w-10 items-center justify-center rounded-full ${
            set.completed ? 'bg-accent' : 'bg-bg-glass active:bg-accent/40'
          }`}
        >
          <Text tone={set.completed ? 'inverse' : 'primary'} variant="subtitle">
            ✓
          </Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-3 pl-11">
        <Text variant="tiny" tone="muted">
          {intensityLabel ? `${intensityLabel} · ` : ''}rest {set.restSeconds}s
        </Text>
        {set.targetRpe != null ? (
          <View className="flex-1">
            <Text variant="tiny" tone="muted">
              RPE EFF.
            </Text>
            <TextInput
              value={set.actualRpe != null ? String(set.actualRpe) : ''}
              onChangeText={(text) => {
                const parsed = parseFloat(text.replace(',', '.'));
                onUpdate({ actualRpe: Number.isFinite(parsed) ? parsed : null });
              }}
              keyboardType="decimal-pad"
              placeholder={String(set.targetRpe)}
              placeholderTextColor="#6B7585"
              editable={!set.completed}
              className="h-9 rounded-xl border border-border-soft bg-bg-glass px-3 text-text-primary"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Memoized: the `set` reference is stable when the corresponding entry inside
 * the Zustand store has not changed, so rest-timer ticks and other set
 * updates do not cause this row to re-render unnecessarily.
 */
export const SetRow = memo(SetRowImpl, (a, b) => a.set === b.set);
