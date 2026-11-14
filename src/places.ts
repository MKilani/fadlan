import type { ArticleRef, Place } from './types';

// Articles of a place ordered by the edition priority (user's language, local, English); Wikipedia before creators.
export function orderedArticles(place: Place, langs: string[]): ArticleRef[] {
  const rank = (a: ArticleRef) => {
    const i = langs.indexOf(a.lang);
    return (i === -1 ? 99 : i) * 2 + (a.source === 'wikipedia' ? 0 : 1);
  };
  return [...place.articles].sort((a, b) => rank(a) - rank(b));
}

export function displayTitle(place: Place, langs: string[]): string {
  return orderedArticles(place, langs)[0]?.title ?? '';
}
