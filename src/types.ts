export type LatLon = { lat: number; lon: number };

export type Source = 'wikipedia' | 'creator';
export type Access = 'free' | 'premium';

// One readable text about a place, in one language, from one source.
export type ArticleRef = {
  id: string;            // namespaced and unique: "wp:en:Pantheon" | "gw:<uuid>"
  lang: string;
  title: string;
  source: Source;
  access: Access;        // premium content is locked until entitlements.ts says otherwise
  author?: string;       // creator content: who wrote it (shown instead of the Wikipedia credit)
  license: string;       // e.g. "CC BY-SA 4.0" for Wikipedia; the creator's own terms later
  url?: string;          // public page, if any ("Open on Wikipedia")
};

export type Place = {
  id: string;            // namespaced: "wd:Q220" (Wikidata) | "wp:en:Title" | "gw:<uuid>" (creator-only place)
  lat: number;
  lon: number;
  description?: string;
  thumb?: string;
  articles: ArticleRef[]; // from every provider; chips in the sheet = this list
  category?: string;      // from Wikidata's class hierarchy (see categories.ts)
};
