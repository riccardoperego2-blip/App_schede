import { View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import {
  FadeInSection,
  PremiumButton,
  PremiumCard,
  StatPill,
  Text,
  AnimatedProgressBar,
} from '../../../design-system';
import type { CompleteWorkoutResponse } from '../../../lib/api/contracts';

export interface WorkoutCompletionStats {
  readonly durationMinutes: number;
  readonly volumeKg: number;
  readonly completedSets: number;
  readonly plannedSets: number;
  readonly completedExercises: number;
  readonly totalExercises: number;
  readonly adherencePct: number;
  readonly dayLabel?: string;
  readonly queued: boolean;
  readonly personalRecords: CompleteWorkoutResponse['adaptation']['personalRecords'];
}

interface WorkoutCompletionSummaryProps {
  stats: WorkoutCompletionStats;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function prTypeLabel(type: WorkoutCompletionStats['personalRecords'][number]['type']): string {
  if (type === 'estimated_1rm') return '1RM stimato';
  if (type === 'max_weight_single') return 'Peso max';
  return 'Volume sessione';
}

export function WorkoutCompletionSummary({ stats }: WorkoutCompletionSummaryProps) {
  const router = useRouter();
  const adherencePct = Math.round(stats.adherencePct * 100);
  const prCount = stats.personalRecords.length;
  const volumeLabel = stats.volumeKg > 0 ? `${Math.round(stats.volumeKg)} kg` : '—';

  return (
    <View className="gap-5">
      <FadeInSection delay={0}>
        <PremiumCard variant="ambient" className="items-center gap-4 p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-border-soft bg-bg-surface">
            <Text variant="display" className="text-3xl leading-9">
              {prCount > 0 ? '🏆' : '🔥'}
            </Text>
          </View>
          <View className="items-center gap-1">
            <Text variant="tiny" tone="accent" className="tracking-widest">
              SESSIONE CHIUSA
            </Text>
            <Text variant="display" className="text-center">
              {prCount > 0 ? 'Ottimo lavoro' : 'Workout completato'}
            </Text>
            <Text tone="secondary" variant="caption" className="text-center">
              {stats.queued
                ? 'Salvato in locale. Si sincronizza appena torni online.'
                : 'Hai fatto il lavoro che conta. Consistenza batte la perfezione.'}
            </Text>
          </View>
        </PremiumCard>
      </FadeInSection>

      <FadeInSection delay={60}>
        <PremiumCard variant="glass" className="gap-4 p-4">
          <Text variant="subtitle" className="font-semibold">
            Riepilogo
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <StatPill label="durata" value={formatDuration(stats.durationMinutes)} active />
            <StatPill label="volume" value={volumeLabel} active={stats.volumeKg > 0} />
            <StatPill
              label="set"
              value={`${stats.completedSets}/${stats.plannedSets || '—'}`}
              active={stats.completedSets > 0}
            />
            <StatPill
              label="esercizi"
              value={`${stats.completedExercises}/${stats.totalExercises || '—'}`}
            />
            {prCount > 0 ? <StatPill label="PR" value={prCount} active /> : null}
          </View>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="caption" tone="muted">
                Aderenza sessione
              </Text>
              <Text variant="caption" tone="secondary">
                {adherencePct}%
              </Text>
            </View>
            <AnimatedProgressBar value={stats.completedSets} max={stats.plannedSets || 1} />
          </View>
        </PremiumCard>
      </FadeInSection>

      {prCount > 0 ? (
        <FadeInSection delay={120}>
          <PremiumCard variant="elevated" className="gap-3 p-4">
            <Text variant="subtitle" className="font-semibold">
              Record personali
            </Text>
            {stats.personalRecords.slice(0, 4).map((pr) => (
              <View
                key={`${pr.exerciseSlug}-${pr.type}`}
                className="flex-row items-center justify-between rounded-card border border-border-soft bg-bg-surface px-3 py-2.5"
              >
                <View className="flex-1 pr-3">
                  <Text variant="caption" className="font-semibold">
                    {pr.exerciseSlug.replace(/-/g, ' ')}
                  </Text>
                  <Text variant="tiny" tone="muted">
                    {prTypeLabel(pr.type)}
                  </Text>
                </View>
                <Text tone="accent" variant="caption" className="font-semibold">
                  {Math.round(pr.value)} {pr.unit}
                </Text>
              </View>
            ))}
          </PremiumCard>
        </FadeInSection>
      ) : null}

      <FadeInSection delay={prCount > 0 ? 180 : 120}>
        <View className="gap-3">
          <PremiumButton label="Torna alla home" onPress={() => router.replace('/(tabs)' as Href)} />
          <PremiumButton
            label="Vedi progressi"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/progress' as Href)}
          />
          <PremiumButton
            label="Chiudi"
            variant="ghost"
            onPress={() => router.replace('/(tabs)' as Href)}
          />
        </View>
      </FadeInSection>
    </View>
  );
}
