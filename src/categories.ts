// Assigns each place to one of the app's categories at runtime, using Wikidata's class hierarchy:
// "instance of" (P31) gives a place's types, "subclass of" (P279) lets us walk up to a broad class.
// It works from Wikidata IDs, so the language of the Wikipedia article does not matter.
import type { Place } from './types';

export const CATEGORIES = [
  { id: 'archaeology', label: 'Archaeology & ruins' },
  { id: 'religious', label: 'Religious sites' },
  { id: 'museums', label: 'Museums & people' },
  { id: 'monuments', label: 'Monuments & buildings' },
  { id: 'nature', label: 'Nature & villages' },
  { id: 'other', label: 'Other' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

// Anchor classes: when a place's type chain reaches one of these, the place gets that category.
// All Q-numbers below appear in the Swiss Wikidata query results.
const ANCHORS: Record<string, CategoryId> = {
  Q839954: 'archaeology',  // archaeological site
  Q109607: 'archaeology',  // ruins
  Q16970: 'religious',     // church building
  Q24398318: 'religious',  // religious building
  Q44613: 'religious',     // monastery
  Q108325: 'religious',    // chapel
  Q33506: 'museums',       // museum
  Q39614: 'museums',       // cemetery
  Q162875: 'museums',      // mausoleum
  Q41176: 'monuments',     // building
  Q23413: 'monuments',     // castle
  Q12280: 'monuments',     // bridge
  Q4989906: 'monuments',   // monument
  Q16560: 'monuments',     // palace
  Q8502: 'nature',         // mountain
  Q23397: 'nature',        // lake
  Q4022: 'nature',         // river
  Q35509: 'nature',        // cave
  Q532: 'nature',          // village
  Q486972: 'nature',       // human settlement
};

// When several categories are found at the same depth, the first one in this list wins.
const PRIORITY: CategoryId[] = ['archaeology', 'religious', 'museums', 'monuments', 'nature'];
const MAX_DEPTH = 4;
const API = 'https://www.wikidata.org/w/api.php';

// Memory caches for the session; the app also caches the place results on the phone and in the browser.
const itemTypes = new Map<string, string[]>();   // item Q-id -> instance-of types
const typeParents = new Map<string, string[]>(); // type Q-id -> subclass-of parents
const typeCategory = new Map<string, CategoryId | null>();

function claimIds(claims: any, prop: string): string[] {
  return (claims?.[prop] ?? []).map((c: any) => c?.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

async function getEntities(params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ action: 'wbgetentities', format: 'json', origin: '*', props: 'claims|sitelinks', ...params });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return res.json();
}

async function loadItemTypes(qids: string[]) {
  const missing = [...new Set(qids)].filter((q) => !itemTypes.has(q));
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    const j = await getEntities({ ids: chunk.join('|'), props: 'claims' });
    for (const q of chunk) itemTypes.set(q, claimIds(j?.entities?.[q]?.claims, 'P31'));
  }
}

async function loadParents(typeIds: string[]) {
  const missing = [...new Set(typeIds)].filter((q) => !typeParents.has(q));
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    const j = await getEntities({ ids: chunk.join('|'), props: 'claims' });
    for (const q of chunk) typeParents.set(q, claimIds(j?.entities?.[q]?.claims, 'P279'));
  }
}

// For articles whose Wikidata item is not known: find the item by title on that Wikipedia edition.
async function itemsByTitle(lang: string, titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const j = await getEntities({ sites: `${lang}wiki`, titles: chunk.join('|'), props: 'claims|sitelinks' });
    for (const [q, ent] of Object.entries<any>(j?.entities ?? {})) {
      if (q.startsWith('-')) continue;
      itemTypes.set(q, claimIds(ent.claims, 'P31'));
      const title = ent.sitelinks?.[`${lang}wiki`]?.title;
      if (title) out.set(title, q);
    }
  }
  return out;
}

// Walk up from the place's types; the closest anchor wins, ties go by PRIORITY.
async function categoryOfTypes(types: string[]): Promise<CategoryId> {
  const key = [...types].sort().join(',');
  if (typeCategory.has(key)) return typeCategory.get(key) ?? 'other';

  let frontier = [...new Set(types)];
  const seen = new Set<string>(frontier);
  let found: CategoryId | null = null;
  for (let depth = 0; depth <= MAX_DEPTH && frontier.length; depth++) {
    const hits = frontier.map((t) => ANCHORS[t]).filter(Boolean) as CategoryId[];
    found = PRIORITY.find((p) => hits.includes(p)) ?? null;
    if (found) break;
    await loadParents(frontier);
    const next = frontier.flatMap((t) => typeParents.get(t) ?? []).filter((t) => !seen.has(t));
    next.forEach((t) => seen.add(t));
    frontier = [...new Set(next)];
  }
  typeCategory.set(key, found);
  return found ?? 'other';
}

// Adds a category to every place. Places whose type cannot be determined become "other".
export async function assignCategories(places: Place[]): Promise<Place[]> {
  const qidOf = new Map<string, string>();
  const titlesByLang = new Map<string, { id: string; title: string }[]>();

  for (const p of places) {
    if (p.id.startsWith('wd:')) {
      qidOf.set(p.id, p.id.slice(3));
      continue;
    }
    const a = p.articles.find((x) => x.source === 'wikipedia');
    if (!a) continue;
    const list = titlesByLang.get(a.lang) ?? [];
    list.push({ id: p.id, title: a.title });
    titlesByLang.set(a.lang, list);
  }

  for (const [lang, items] of titlesByLang) {
    const found = await itemsByTitle(lang, items.map((x) => x.title));
    for (const x of items) {
      const q = found.get(x.title);
      if (q) qidOf.set(x.id, q);
    }
  }

  await loadItemTypes([...qidOf.values()]);

  const category = new Map<string, CategoryId>();
  for (const p of places) {
    const q = qidOf.get(p.id);
    const types = q ? itemTypes.get(q) ?? [] : [];
    category.set(p.id, types.length ? await categoryOfTypes(types) : 'other');
  }
  return places.map((p) => ({ ...p, category: category.get(p.id) ?? 'other' }));
}
