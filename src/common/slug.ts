export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugToDisplayName(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').trim();
}
