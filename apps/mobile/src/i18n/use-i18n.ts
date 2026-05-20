import { useCallback } from 'react';
import { useSettingsStore } from '../stores/settings.store';
import { localeForLanguage, translate, type AppLanguage, type TranslationParams } from './index';
import { translateExerciseName } from './exercise-names';
import { translateMuscleName } from './muscle-names';

export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(language, key, params),
    [language],
  );

  const te = useCallback(
    (slugOrName: string, fallbackName?: string) => translateExerciseName(slugOrName, language, fallbackName),
    [language],
  );

  const tm = useCallback((muscleGroup: string) => translateMuscleName(muscleGroup, language), [language]);

  return {
    language,
    setLanguage,
    locale: localeForLanguage(language),
    t,
    te,
    tm,
  };
}

export type { AppLanguage };
