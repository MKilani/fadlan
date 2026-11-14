// Wikimedia asks for a descriptive User-Agent with a way to contact you. Edit this.
export const USER_AGENT = 'Fadlan/0.1 (https://example.org/fadlan; contact@example.org)';

// DEMO style only. Before publishing, switch to a tile provider you have rights to use
// (MapTiler, Stadia, Mapbox, or self-hosted Protomaps). OSM's free servers forbid app use.
export const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export const RADIUS_M = 3000;          // search radius (Wikipedia allows up to 10000)
export const REFETCH_FRACTION = 0.5;   // re-query when the map centre moves this fraction of the radius
export const MAX_EDITIONS = 6;         // user's language + local language(s) + English
// Creator marketplace (accounts, paid content). Keep false until a backend exists; see src/providers/creator.ts.
export const ENABLE_CREATOR_CONTENT = false;

export const GEO_TTL_MS = 24 * 3600 * 1000;
