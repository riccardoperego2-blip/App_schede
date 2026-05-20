import type { AppLanguage, TranslationDictionary, TranslationParams } from './types';
import { it } from './translations/it';
import { en } from './translations/en';

const dictionaries: Record<AppLanguage, TranslationDictionary> = { it, en };

function isDictionary(value: unknown): value is TranslationDictionary {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getByPath(dict: TranslationDictionary, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (!isDictionary(current)) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{{${token}}}` : String(value);
  });
}

export function translate(lang: AppLanguage, key: string, params?: TranslationParams): string {
  const primary = getByPath(dictionaries[lang], key);
  const fallback = lang === 'it' ? undefined : getByPath(dictionaries.it, key);
  const resolved = primary ?? fallback ?? key;
  return interpolate(resolved, params);
}

export function localeForLanguage(lang: AppLanguage): string {
  return lang === 'en' ? 'en-US' : 'it-IT';
}

export { it, en };
export type { AppLanguage, TranslationParams } from './types';
