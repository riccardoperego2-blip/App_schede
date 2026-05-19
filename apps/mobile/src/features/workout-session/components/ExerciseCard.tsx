import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Button, PremiumCard, StatPill } from '../../../design-system';
import { SetRow } from './SetRow';
import type { ExerciseDraft, SetDraft } from '../../../stores/workout-session.store';

interface ExerciseCardProps {
  exercise: ExerciseDraft;
  onToggle: () => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetDraft>) => void;
  onCompleteSet: (setIndex: number) => void;
}

function ExerciseCardImpl({
  exercise,
  onToggle,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
}: ExerciseCardProps) {
  const totalCompleted = exercise.sets.filter((s) => s.completed).length;

  return (
    <PremiumCard className="gap-4">
      <Pressable onPress={onToggle} className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text variant="subtitle">{exercise.name}</Text>
          <Text tone="muted" variant="caption">
            {exercise.primaryMuscle} · {totalCompleted}/{exercise.sets.length} set · rest {exercise.restSeconds}s
          </Text>
        </View>
        <StatPill label="set" value={`${totalCompleted}/${exercise.sets.length}`} active={totalCompleted > 0} />
      </Pressable>

      {exercise.expanded ? (
        <View className="gap-2">
          {exercise.sets.map((set) => (
            <SetRow
              key={set.setIndex}
              set={set}
              onUpdate={(patch) => onUpdateSet(set.setIndex, patch)}
              onComplete={() => onCompleteSet(set.setIndex)}
            />
          ))}
          <Button label="+ Aggiungi serie" variant="ghost" size="sm" onPress={onAddSet} />
        </View>
      ) : null}
    </PremiumCard>
  );
}

/**
 * Memoized to avoid re-rendering every exercise card on each set update or
 * timer tick. Callbacks from the parent screen are stable references because
 * they read from the Zustand store via getState() rather than via subscription.
 */
export const ExerciseCard = memo(ExerciseCardImpl, (a, b) => a.exercise === b.exercise);
