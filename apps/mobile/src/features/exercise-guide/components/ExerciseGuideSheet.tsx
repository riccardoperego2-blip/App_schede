import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FadeInSection,
  PremiumButton,
  PremiumCard,
  Text,
} from '../../../design-system';
import { colors } from '../../../theme';
import { useI18n } from '../../../i18n/use-i18n';
import {
  getExerciseGuide,
  pickLocalizedList,
  pickLocalizedText,
} from '../data/exercise-guides';

interface ExerciseGuideSheetProps {
  visible: boolean;
  exerciseSlug: string;
  exerciseName?: string;
  primaryMuscle?: string;
  onClose: () => void;
}

function BulletList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2.5">
      {items.map((item, index) => (
        <View key={`${index}-${item}`} className="flex-row gap-3">
          <View
            className="mt-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
          <Text variant="caption" tone="secondary" className="flex-1 leading-5">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MusclePills({ muscles, label }: { muscles: readonly string[]; label: (m: string) => string }) {
  if (muscles.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {muscles.map((muscle) => (
        <View
          key={muscle}
          className="rounded-pill border px-3 py-1.5"
          style={{
            borderColor: `${colors.primary}33`,
            backgroundColor: `${colors.primary}12`,
          }}
        >
          <Text variant="tiny" tone="accent" className="font-semibold">
            {label(muscle)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ExerciseGuideSheet({
  visible,
  exerciseSlug,
  exerciseName,
  primaryMuscle,
  onClose,
}: ExerciseGuideSheetProps) {
  const insets = useSafeAreaInsets();
  const { t, te, tm, language } = useI18n();

  const resolved = useMemo(
    () => getExerciseGuide(exerciseSlug, primaryMuscle),
    [exerciseSlug, primaryMuscle],
  );

  const displayName = te(exerciseSlug, exerciseName);
  const muscleKeys = resolved.found
    ? resolved.muscles
    : primaryMuscle
      ? [primaryMuscle]
      : [];

  const instructions = resolved.guide
    ? pickLocalizedList(resolved.guide.instructions, language)
    : [];
  const mistakes = resolved.guide
    ? pickLocalizedList(resolved.guide.commonMistakes, language)
    : [];
  const quickTip = resolved.guide
    ? pickLocalizedText(resolved.guide.quickTip, language)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(3, 5, 7, 0.82)' }}
        onPress={onClose}
        accessibilityLabel={t('common.close')}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[88%] rounded-t-[28px] border-t border-border-soft bg-bg-primary"
          style={{
            paddingBottom: Math.max(insets.bottom, 16),
            shadowColor: colors.primary,
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -8 },
          }}
        >
          <View className="items-center py-3">
            <View className="h-1 w-10 rounded-pill bg-bg-glass" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}
          >
            <FadeInSection delay={0}>
              <PremiumCard variant="ambient" className="gap-3 p-5">
                <Text variant="tiny" tone="accent" className="tracking-widest">
                  {t('exerciseGuide.title')}
                </Text>
                <Text variant="title">{displayName}</Text>
                {muscleKeys.length > 0 ? (
                  <View className="gap-2">
                    <Text variant="caption" tone="muted">
                      {t('exerciseGuide.muscles')}
                    </Text>
                    <MusclePills muscles={muscleKeys} label={tm} />
                  </View>
                ) : null}
              </PremiumCard>
            </FadeInSection>

            {!resolved.found ? (
              <FadeInSection delay={40}>
                <PremiumCard variant="glass" className="p-4">
                  <Text tone="secondary" variant="caption">
                    {t('exerciseGuide.notAvailable')}
                  </Text>
                </PremiumCard>
              </FadeInSection>
            ) : null}

            {instructions.length > 0 ? (
              <FadeInSection delay={resolved.found ? 60 : 80}>
                <PremiumCard variant="elevated" className="gap-3 p-4">
                  <Text variant="subtitle" className="font-semibold">
                    {t('exerciseGuide.howTo')}
                  </Text>
                  <BulletList items={instructions} />
                </PremiumCard>
              </FadeInSection>
            ) : null}

            {mistakes.length > 0 ? (
              <FadeInSection delay={resolved.found ? 100 : 120}>
                <PremiumCard variant="glass" className="gap-3 p-4">
                  <Text variant="subtitle" className="font-semibold">
                    {t('exerciseGuide.commonMistakes')}
                  </Text>
                  <BulletList items={mistakes} />
                </PremiumCard>
              </FadeInSection>
            ) : null}

            {quickTip ? (
              <FadeInSection delay={resolved.found ? 140 : 160}>
                <PremiumCard
                  variant="default"
                  className="gap-2 p-4"
                  style={{ borderColor: `${colors.primary}28` }}
                >
                  <Text variant="caption" tone="accent" className="font-semibold tracking-wide">
                    {t('exerciseGuide.quickTip')}
                  </Text>
                  <Text variant="caption" tone="secondary" className="leading-5">
                    {quickTip}
                  </Text>
                </PremiumCard>
              </FadeInSection>
            ) : null}
          </ScrollView>

          <View className="px-5 pt-2">
            <PremiumButton label={t('exerciseGuide.gotIt')} haptic onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
