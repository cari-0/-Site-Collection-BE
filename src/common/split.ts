import { toSlug } from './slug';

export function splitNames(raw?: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,，]/)) {
    const name = part.trim().replace(/^#/, '');
    if (!name) continue;
    const slug = toSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    names.push(name);
  }
  return names;
}
