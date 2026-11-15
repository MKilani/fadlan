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

// When several categories are found, the first one in this list wins.
const PRIORITY: CategoryId[] = ['archaeology', 'religious', 'museums', 'monuments', 'nature'];
const MAX_DEPTH = 4;
const API = 'https://www.wikidata.org/w/api.php';

// Session caches: each Wikidata item and type is fetched once.
const itemTypes = new Map<string, string[]>();          // item Q-id -> instance-of types
const typeParents = new Map<string, string[]>();        // type Q-id -> subclass-of parents
const typeCategory = new Map<string, CategoryId | null>(); // type Q-id -> category (or null if none)

function claimIds(claims: any, prop: string): string[] {
  return (claims?.[prop] ?? []).map((c: any) => c?.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

async function getEntities(params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ action: 'wbgetentities', format: 'json', origin: '*', props: 'claims|sitelinks', ...params });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return res.json();
}

// Splits a list into chunks of 50 (the API limit) and runs them in parallel.
function chunks<T>(list: T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function loadItemTypes(qids: string[]) {
  const missing = [...new Set(qids)].filter((q) => !itemTypes.has(q));
  await Promise.all(chunks(missing).map(async (chunk) => {
    const j = await getEntities({ ids: chunk.join('|'), props: 'claims' });
    for (const q of chunk) itemTypes.set(q, claimIds(j?.entities?.[q]?.claims, 'P31'));
  }));
}

async function loadParents(typeIds: string[]) {
  const missing = [...new Set(typeIds)].filter((q) => !typeParents.has(q));
  await Promise.all(chunks(missing).map(async (chunk) => {
    const j = await getEntities({ ids: chunk.join('|'), props: 'claims' });
    for (const q of chunk) typeParents.set(q, claimIds(j?.entities?.[q]?.claims, 'P279'));
  }));
}

// For articles whose Wikidata item is not known: find the item by title on that Wikipedia edition.
async function itemsByTitle(lang: string, titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(chunks(titles).map(async (chunk) => {
    const j = await getEntities({ sites: `${lang}wiki`, titles: chunk.join('|'), props: 'claims|sitelinks' });
    for (const [q, ent] of Object.entries<any>(j?.entities ?? {})) {
      if (q.startsWith('-')) continue;
      itemTypes.set(q, claimIds(ent.claims, 'P31'));
      const title = ent.sitelinks?.[`${lang}wiki`]?.title;
      if (title) out.set(title, q);
    }
  }));
  return out;
}

// Resolves the category of many types at once. Each type walks up its own parents, one level per step,
// and takes the closest anchor it reaches. Every level is fetched in parallel batches.
async function resolveTypes(types: string[]) {
  const pending = [...new Set(types)].filter((t) => !typeCategory.has(t));
  if (!pending.length) return;

  let layers = new Map<string, string[]>(pending.map((t) => [t, [t]]));   // type -> current level
  const seen = new Map<string, Set<string>>(pending.map((t) => [t, new Set([t])]));

  for (let depth = 0; depth <= MAX_DEPTH && layers.size; depth++) {
    for (const [t, layer] of [...layers]) {
      const hits = layer.map((x) => ANCHORS[x]).filter(Boolean) as CategoryId[];
      const hit = PRIORITY.find((p) => hits.includes(p));
      if (hit) {
        typeCategory.set(t, hit);
        layers.delete(t);
      }
    }
    if (depth === MAX_DEPTH || !layers.size) break;

    await loadParents([...new Set([...layers.values()].flat())]);

    const next = new Map<string, string[]>();
    for (const [t, layer] of layers) {
      const s = seen.get(t)!;
      const parents = [...new Set(layer.flatMap((x) => typeParents.get(x) ?? []))].filter((x) => !s.has(x));
      parents.forEach((x) => s.add(x));
      if (parents.length) next.set(t, parents);
    }
    layers = next;
  }
  for (const t of pending) if (!typeCategory.has(t)) typeCategory.set(t, null);
}

// The category of a place: the best of its types, by PRIORITY.
function categoryOf(qid: string | undefined): CategoryId {
  const cats = (qid ? itemTypes.get(qid) ?? [] : [])
    .map((t) => typeCategory.get(t))
    .filter(Boolean) as CategoryId[];
  return PRIORITY.find((p) => cats.includes(p)) ?? 'other';
}

// Adds a category to every place. Places in `known` keep their category and are not looked up again.
export async function assignCategories(places: Place[], known?: Map<string, string>): Promise<Place[]> {
  const todo = places.filter((p) => !known?.has(p.id));
  const qidOf = new Map<string, string>();
  const titlesByLang = new Map<string, { id: string; title: string }[]>();

  for (const p of todo) {
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

  // 1) the Wikidata item of each place (in parallel per language)
  await Promise.all([...titlesByLang].map(async ([lang, items]) => {
    const found = await itemsByTitle(lang, items.map((x) => x.title));
    for (const x of items) {
      const q = found.get(x.title);
      if (q) qidOf.set(x.id, q);
    }
  }));

  // 2) the types of all items, 3) the category of all types, 4) each place
  await loadItemTypes([...qidOf.values()]);
  const allTypes = [...qidOf.values()].flatMap((q) => itemTypes.get(q) ?? []);
  await resolveTypes(allTypes);

  return places.map((p) => ({
    ...p,
    category: known?.get(p.id) ?? categoryOf(qidOf.get(p.id)),
  }));
}
