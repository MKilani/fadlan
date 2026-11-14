import type { ContentProvider } from './types';

// PLACEHOLDER for the future creator marketplace. Not enabled (see ENABLE_CREATOR_CONTENT in config.ts).
//
// When you build the backend, implement these three calls against your own API, returning the same shapes:
//   fetchPlaces: places inside the radius with their creator articles, each as
//                { id: "gw:<uuid>" or "wd:Q..." (to attach to a Wikipedia/Wikidata place),
//                  articles: [{ source: 'creator', access: 'free' | 'premium', author, license, ... }] }
//   getSummary / getFullText: the article text. For premium articles the server must check the
//                subscription and refuse otherwise (never rely on the app alone to hide paid content).
// Places returned with a "wd:Q..." id are merged with the Wikipedia ones by loadPlaces().
export const creatorProvider: ContentProvider = {
  id: 'creator',
  async fetchPlaces() {
    return [];
  },
  async getSummary() {
    throw new Error('Creator content is not enabled yet');
  },
  async getFullText() {
    throw new Error('Creator content is not enabled yet');
  },
};
