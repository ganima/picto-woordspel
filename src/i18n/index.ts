import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import nl from './nl';
import en from './en';
import { settings } from '@/lib/settings';

export const messages = { nl, en };

export const i18n = createI18n({
  legacy: false,
  locale: settings.lang,
  fallbackLocale: 'nl',
  messages,
});

// The language is a device setting; keep vue-i18n and <html lang> in step with it.
watch(
  () => settings.lang,
  (lang) => {
    i18n.global.locale.value = lang;
    document.documentElement.lang = lang;
  },
  { immediate: true },
);
