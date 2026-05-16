import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { mmkv } from '../lib/storage/mmkv';

const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => mmkv.delete(name),
};

interface SettingsState {
  weightUnit: 'kg' | 'lb';
  measurementUnit: 'cm' | 'in';
  hapticsEnabled: boolean;
  keepScreenOn: boolean;
  notificationsEnabled: boolean;
  language: 'it' | 'en';
  setWeightUnit: (unit: 'kg' | 'lb') => void;
  setMeasurementUnit: (unit: 'cm' | 'in') => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setKeepScreenOn: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLanguage: (language: 'it' | 'en') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      weightUnit: 'kg',
      measurementUnit: 'cm',
      hapticsEnabled: true,
      keepScreenOn: true,
      notificationsEnabled: true,
      language: 'it',
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setMeasurementUnit: (measurementUnit) => set({ measurementUnit }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setKeepScreenOn: (keepScreenOn) => set({ keepScreenOn }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'schede.settings.v1',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
