import { USER_AGENT, GEO_TTL_MS } from '../config';
import { cached } from '../cache';
import type { ArticleRef, LatLon, Place } from '../types';
import type { ContentProvider, PlaceQuery } from './types';

const HEADERS = { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT };

type Raw = {
  title: string;
  description?: string;
  thumbnail?: { source: string };
  coordinates?: { lat: number; lon: number }[];
  pageprops?: { wikibase_item?: string };
};

async function geosearch(lang: string, lat: number, lon: number, radius: number): Promise<Raw[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', formatversion: '2',
    generator: 'geosearch', ggscoord: `${lat}|${lon}`, ggsradius: String(radius), ggslimit: '200',
    prop: 'coordinates|pageprops|description|pageimages',
    ppprop: 'wikibase_item', colimit: 'max', piprop: 'thumbnail', pithumbsize: '480',
  });
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Wikipedia ${lang}: HTTP ${res.status}`);
  const json = await res.json();
  return json?.query?.pages ?? [];
}

const snap = (n: number) => Math.round(n * 100) / 100; // ~1 km grid, so nearby queries share a cache entry

function articleOf(lang: string, title: string): ArticleRef {
  return {
    id: `wp:${lang}:${title}`, lang, title, source: 'wikipedia', access: 'free', license: 'CC BY-SA 4.0',
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

async function fetchPlaces({ center, radiusM, langs }: PlaceQuery): Promise<Place[]> {
  const lat = snap(center.lat), lon = snap(center.lon);
  const results = await Promise.allSettled(
    langs.map((l) => cached(`geo:${l}:${lat}:${lon}:${radiusM}`, GEO_TTL_MS, () => geosearch(l, lat, lon, radiusM))),
  );
  // Pages describing the same thing in different editions share a Wikidata ID and become one place.
  const byId = new Map<string, Place>();
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const lang = langs[i];
    for (const p of r.value) {
      const c = p.coordinates?.[0];
      if (!c) continue;
      const qid = p.pageprops?.wikibase_item;
      const id = qid ? `wd:${qid}` : `wp:${lang}:${p.title}`;
      const art = articleOf(lang, p.title);
      const ex = byId.get(id);
      if (ex) {
        ex.articles.push(art);
        ex.description ??= p.description;
        ex.thumb ??= p.thumbnail?.source;
      } else {
        byId.set(id, { id, lat: c.lat, lon: c.lon, description: p.description, thumb: p.thumbnail?.source, articles: [art] });
      }
    }
  });
  return [...byId.values()];
}

async function extract(a: ArticleRef, intro: boolean): Promise<string> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', formatversion: '2', prop: 'extracts',
    explaintext: '1', redirects: '1', titles: a.title,
  });
  if (intro) params.set('exintro', '1');
  const res = await fetch(`https://${a.lang}.wikipedia.org/w/api.php?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.query?.pages?.[0]?.extract ?? '';
}

export const wikipediaProvider: ContentProvider = {
  id: 'wikipedia',
  fetchPlaces,
  // Summary loads when a marker is tapped; the full text only when the reader asks. Both are cached for offline use.
  getSummary: (a) => cached(`sum:${a.id}`, null, () => extract(a, true)),
  getFullText: (a) => cached(`full:${a.id}`, null, () => extract(a, false)),
};

// Photo of an article, taken from the article's own page summary (more reliable than the list thumbnail).
export async function thumbFor(a: ArticleRef): Promise<string | undefined> {
  if (a.source !== 'wikipedia') return undefined;
  const title = a.title.replace(/ /g, '_');
  try {
    const v = await cached(`thumb:${a.id}`, 7 * 24 * 3600 * 1000, async () => {
      const res = await fetch(`https://${a.lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: HEADERS });
      if (!res.ok) return '';
      const j = await res.json();
      return (j?.thumbnail?.source as string) ?? '';
    });
    console.log('Fadlan: photo for', a.title, '->', v || 'none');
    return v || undefined;
  } catch (e) {
    console.warn('Fadlan: photo lookup failed for', a.title, String(e));
    return undefined;
  }
}

export type PhotoItem = { uri: string; caption: string };

// Files that are decoration rather than photos of the place.
const NOT_A_PHOTO = /flag|logo|icon|coat of arms|wappen|stemma|symbol|signature|locator|map of|edit-|commons-logo/i;

// All usable photos on an article's page (JPEG, PNG, WebP; no icons or logos).
export async function photosFor(a: ArticleRef): Promise<PhotoItem[]> {
  if (a.source !== 'wikipedia') return [];
  try {
    return await cached(`photos:${a.id}`, 7 * 24 * 3600 * 1000, async () => {
      const params = new URLSearchParams({
        action: 'query', format: 'json', origin: '*', formatversion: '2', generator: 'images', titles: a.title,
        gimlimit: '60', prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: '1000',
      });
      const res = await fetch(`https://${a.lang}.wikipedia.org/w/api.php?${params}`, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const pages: any[] = json?.query?.pages ?? [];
      return pages
        .filter((p) => {
          const info = p.imageinfo?.[0];
          return info && /^image\/(jpeg|png|webp)$/.test(info.mime) && !NOT_A_PHOTO.test(p.title);
        })
        .map((p) => ({
          uri: p.imageinfo[0].thumburl ?? p.imageinfo[0].url,
          caption: String(p.title).replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
        }));
    });
  } catch (e) {
    console.warn('Fadlan: photo list failed for', a.title, String(e));
    return [];
  }
}
