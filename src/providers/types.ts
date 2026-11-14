import type { ArticleRef, LatLon, Place, Source } from '../types';

export type PlaceQuery = { center: LatLon; radiusM: number; langs: string[] };

// A content source. Wikipedia is the first; creator content from your own backend is the next.
export interface ContentProvider {
  id: Source;
  fetchPlaces(q: PlaceQuery): Promise<Place[]>;
  getSummary(a: ArticleRef): Promise<string>;
  getFullText(a: ArticleRef): Promise<string>;
}
