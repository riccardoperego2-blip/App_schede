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
  const allDone = totalCompleted > 0 && totalCompleted === exercise.sets.length;

  return (
    <PremiumCard variant={allDone ? 'glass' : 'default'} className="gap-3 p-4">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.name}, ${totalCompleted} su ${exercise.sets.length} serie completate`}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 gap-0.5 pr-3">
          <Text variant="subtitle" className="font-semibold">
            {exercise.name}
          </Text>
          <Text tone="muted" variant="caption">
            {exercise.primaryMuscle} · rest {exercise.restSeconds}s
          </Text>
        </View>
        <StatPill
          label="set"
          value={`${totalCompleted}/${exercise.sets.length}`}
          active={totalCompleted > 0}
        />
      </Pressable>

      {exercise.expanded ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2 px-1 pb-1">
            <View className="w-9" />
            <Text variant="tiny" tone="muted" className="flex-1">
              KG
            </Text>
            <Text variant="tiny" tone="muted" className="flex-1">
              REPS
            </Text>
            <View className="w-11" />
          </View>
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

export const ExerciseCard = memo(ExerciseCardImpl, (a, b) => a.exercise === b.exercise);
