// Map labels: MapLibre falls back to the font "Open Sans Regular, Arial Unicode MS Regular" wherever a symbol layer
// does not set text-font. OpenFreeMap does not serve that font, so every label request returned 404.
// We load the style and set text-font on EVERY symbol layer to one font the server provides.
// If the server reports a different font as missing, change FONT.
const FONT = 'Noto Sans Regular';

// Shown while the real style is loading, so the map never requests the broken URL.
export const EMPTY_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#EEEAE0' } }],
} as any;

export async function loadPatchedStyle(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Style HTTP ${res.status}`);
  const style = await res.json();
  for (const layer of style.layers ?? []) {
    if (layer.type !== 'symbol') continue;
    layer.layout = layer.layout ?? {};
    layer.layout['text-font'] = [FONT];
  }
  return style;
}
