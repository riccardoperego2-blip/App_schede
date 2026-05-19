import { memo } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../design-system';
import { colors } from '../../../theme';
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

  const handleComplete = () => {
    if (!set.completed) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete();
  };

  return (
    <View
      className={[
        'gap-2 rounded-card border p-3',
        set.completed ? 'border-border-soft bg-bg-glass' : 'border-border-soft bg-bg-surface',
      ].join(' ')}
      style={set.completed ? { shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 8 } : undefined}
    >
      <View className="flex-row items-center gap-2">
        <View className="w-9 items-center">
          <Text variant="tiny" tone="muted">
            SET
          </Text>
          <Text variant="caption" className="font-semibold">
            {set.setIndex}
          </Text>
        </View>

        <View className="flex-1">
          <Text variant="tiny" tone="muted">
            KG
          </Text>
          <TextInput
            value={set.loadKg != null ? String(set.loadKg) : ''}
            onChangeText={(text) => {
              const parsed = parseFloat(text.replace(',', '.'));
              onUpdate({ loadKg: Number.isFinite(parsed) ? parsed : null });
            }}
            keyboardType="decimal-pad"
            placeholder={set.targetLoadKg ? String(set.targetLoadKg) : '—'}
            placeholderTextColor="#667085"
            editable={!set.completed}
            className="h-11 rounded-xl border border-border-soft bg-bg-card px-3 text-text-primary"
          />
        </View>

        <View className="flex-1">
          <Text variant="tiny" tone="muted">
            REPS
          </Text>
          <TextInput
            value={set.completedReps > 0 ? String(set.completedReps) : ''}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onUpdate({ completedReps: Number.isFinite(parsed) ? parsed : 0 });
            }}
            keyboardType="number-pad"
            placeholder={target}
            placeholderTextColor="#667085"
            editable={!set.completed}
            className="h-11 rounded-xl border border-border-soft bg-bg-card px-3 text-text-primary"
          />
        </View>

        <Pressable
          onPress={handleComplete}
          disabled={set.completed}
          accessibilityRole="button"
          accessibilityLabel={set.completed ? 'Serie completata' : 'Segna serie completata'}
          className={[
            'mt-4 h-11 w-11 items-center justify-center rounded-full border',
            set.completed ? 'border-accent/40 bg-accent' : 'border-border-soft bg-bg-card',
          ].join(' ')}
        >
          <Text tone={set.completed ? 'inverse' : 'secondary'} variant="subtitle">
            ✓
          </Text>
        </Pressable>
      </View>

      {(intensityLabel || set.targetRpe != null) && (
        <View className="flex-row items-center gap-3 pl-11">
          {intensityLabel ? (
            <Text variant="tiny" tone="muted">
              {intensityLabel} · rest {set.restSeconds}s
            </Text>
          ) : null}
          {set.targetRpe != null ? (
            <View className="min-w-[88px] flex-1">
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
                placeholderTextColor="#667085"
                editable={!set.completed}
                className="h-9 rounded-xl border border-border-soft bg-bg-card px-3 text-text-primary"
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export const SetRow = memo(SetRowImpl, (a, b) => a.set === b.set);
