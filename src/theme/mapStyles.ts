import type { MapStyleId } from './types';

// A map style = the base map only. Pins and labels come from the app style.
// Free vector tiles from OpenFreeMap (OpenStreetMap data, no API key). Check openfreemap.org for current terms
// before a commercial release; a paid provider or self-hosted tiles may be needed later.
export type MapStyleDef = { id: MapStyleId; label: string; url: string; tint?: { color: string; opacity: number } };

export const MAP_STYLES: Record<MapStyleId, MapStyleDef> = {
  plain: { id: 'plain', label: 'Plain', url: 'https://tiles.openfreemap.org/styles/positron' },
  // Same streets as Plain, with a warm parchment tint laid over the map (a placeholder for a designed map style).
  fantasy: {
    id: 'fantasy',
    label: 'Storybook',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    tint: { color: '#E8D9B0', opacity: 0.35 },
  },
};
