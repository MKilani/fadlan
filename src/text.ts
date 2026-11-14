export type Section = { heading?: string; body: string };

// Plain-text extracts mark headings as "== History ==". Split on them and drop empty sections.
export function parseSections(text: string): Section[] {
  const out: Section[] = [];
  let cur: Section = { body: '' };
  for (const line of text.split('\n')) {
    const m = line.match(/^(={2,})\s*(.+?)\s*\1\s*$/);
    if (m) {
      out.push(cur);
      cur = { heading: m[2], body: '' };
    } else cur.body += line + '\n';
  }
  out.push(cur);
  return out.filter((s) => s.body.trim());
}
