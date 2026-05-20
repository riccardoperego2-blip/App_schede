export type AppLanguage = 'it' | 'en';

export type TranslationParams = Record<string, string | number>;

export interface TranslationDictionary {
  readonly [key: string]: string | TranslationDictionary;
}
