import { ENABLE_CREATOR_CONTENT } from '../config';
import type { ArticleRef, Place } from '../types';
import type { ContentProvider, PlaceQuery } from './types';
import { wikipediaProvider } from './wikipedia';
import { creatorProvider } from './creator';

const active: ContentProvider[] = [wikipediaProvider, ...(ENABLE_CREATOR_CONTENT ? [creatorProvider] : [])];

const providerFor = (a: ArticleRef) => {
  const p = active.find((x) => x.id === a.source);
  if (!p) throw new Error(`No provider for source ${a.source}`);
  return p;
};

// Asks every active provider, then merges places with the same id (e.g. a creator note attached to a Wikidata place).
export async function loadPlaces(q: PlaceQuery): Promise<Place[]> {
  const results = await Promise.allSettled(active.map((p) => p.fetchPlaces(q)));
  const byId = new Map<string, Place>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const place of r.value) {
      const ex = byId.get(place.id);
      if (!ex) { byId.set(place.id, place); continue; }
      for (const a of place.articles) if (!ex.articles.some((x) => x.id === a.id)) ex.articles.push(a);
      ex.description ??= place.description;
      ex.thumb ??= place.thumb;
    }
  }
  return [...byId.values()];
}

export const getSummary = (a: ArticleRef) => providerFor(a).getSummary(a);
export const getFullText = (a: ArticleRef) => providerFor(a).getFullText(a);
export { thumbFor as getThumb } from './wikipedia';
export { photosFor } from './wikipedia';
