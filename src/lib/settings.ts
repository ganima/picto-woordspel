import { reactive, watch } from 'vue';

// Settings that belong to this device only (section 9 of HANDOVER.md), kept in localStorage.

export type Lang = 'nl' | 'en';

export interface DeviceSettings {
  lang: Lang;
  choices: 2 | 3 | 4;
  showWords: boolean;
  ding: boolean;
}

const KEY = 'picto.settings.v1';

export const DEFAULT_SETTINGS: DeviceSettings = { lang: 'nl', choices: 3, showWords: true, ding: true };

/** Merge stored JSON over the defaults, dropping anything malformed. */
export function parseSettings(raw: string | null): DeviceSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw) return out;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof DeviceSettings, unknown>>;
    if (v.lang === 'nl' || v.lang === 'en') out.lang = v.lang;
    if (v.choices === 2 || v.choices === 3 || v.choices === 4) out.choices = v.choices;
    if (typeof v.showWords === 'boolean') out.showWords = v.showWords;
    if (typeof v.ding === 'boolean') out.ding = v.ding;
  } catch {
    // ignore: fall back to defaults
  }
  return out;
}

function load(): DeviceSettings {
  try {
    return parseSettings(localStorage.getItem(KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const settings = reactive<DeviceSettings>(load());

watch(
  settings,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      // private mode or storage blocked: settings just won't survive a reload
    }
  },
  { deep: true },
);
