import type { ArticleRef } from './types';

const NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano', es: 'Español', pt: 'Português',
  el: 'Ελληνικά', ar: 'العربية', tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', ru: 'Русский',
  ja: '日本語', zh: '中文', he: 'עברית', cs: 'Čeština', sv: 'Svenska', hu: 'Magyar',
};

export const languageName = (lang: string) => NAMES[lang] ?? lang.toUpperCase();

// Credit line shown under every article. Driven by the source, never hard-coded in the UI.
export function attributionFor(a: ArticleRef): { text: string; linkLabel?: string; url?: string } {
  if (a.source === 'wikipedia') {
    return { text: `Text from Wikipedia (${languageName(a.lang)}), licensed ${a.license}.`, linkLabel: 'Open on Wikipedia', url: a.url };
  }
  return { text: `By ${a.author ?? 'a Fadlan creator'}. ${a.license}.`, url: a.url };
}
