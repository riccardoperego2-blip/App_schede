import { memo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Button, PremiumCard, StatPill } from '../../../design-system';
import { useI18n } from '../../../i18n/use-i18n';
import { ExerciseGuideSheet } from '../../exercise-guide';
import { SetRow } from './SetRow';
import type { ExerciseDraft, SetDraft } from '../../../stores/workout-session.store';
import { colors } from '../../../theme';

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
  const { t, te, tm } = useI18n();
  const [guideOpen, setGuideOpen] = useState(false);
  const totalCompleted = exercise.sets.filter((s) => s.completed).length;
  const allDone = totalCompleted > 0 && totalCompleted === exercise.sets.length;
  const exerciseName = te(exercise.slug, exercise.name);
  const muscleLabel = tm(exercise.primaryMuscle);

  return (
    <>
      <PremiumCard variant={allDone ? 'glass' : 'default'} className="gap-3 p-4">
        <View className="flex-row items-start gap-2">
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={t('workout.setsProgress', { done: totalCompleted, total: exercise.sets.length })}
            className="min-h-[44px] flex-1 flex-row items-center justify-between"
          >
            <View className="flex-1 gap-0.5 pr-2">
              <Text variant="subtitle" className="font-semibold">
                {exerciseName}
              </Text>
              <Text tone="muted" variant="caption">
                {muscleLabel} · {t('workout.restSec', { sec: exercise.restSeconds })}
              </Text>
            </View>
            <StatPill
              label={t('stat.sets')}
              value={`${totalCompleted}/${exercise.sets.length}`}
              active={totalCompleted > 0}
            />
          </Pressable>

          <Pressable
            onPress={() => setGuideOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('exerciseGuide.openHint')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border px-2.5"
            style={{
              borderColor: `${colors.primary}40`,
              backgroundColor: `${colors.primary}10`,
            }}
          >
            <Text variant="tiny" tone="accent" className="font-semibold">
              ℹ
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setGuideOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('exerciseGuide.openHint')}
          className="self-start rounded-pill border border-border-soft bg-bg-glass px-3 py-1.5"
        >
          <Text variant="tiny" tone="secondary">
            {t('exerciseGuide.open')}
          </Text>
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
            <Button label={t('workout.addSet')} variant="ghost" size="sm" onPress={onAddSet} />
          </View>
        ) : null}
      </PremiumCard>

      <ExerciseGuideSheet
        visible={guideOpen}
        exerciseSlug={exercise.slug}
        exerciseName={exercise.name}
        primaryMuscle={exercise.primaryMuscle}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}

export const ExerciseCard = memo(ExerciseCardImpl, (a, b) => a.exercise === b.exercise);
