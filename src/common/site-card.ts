type SiteWithRelations = {
  slug: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  category?: { name: string } | null;
  tags?: { tag: { name: string } }[];
};

export function toSiteCard(site: SiteWithRelations) {
  return {
    slug: site.slug,
    name: site.name,
    description: site.description,
    url: site.url,
    imageUrl: site.imageUrl,
    category: site.category?.name,
    tags: (site.tags ?? []).map((row) => row.tag.name),
  };
}
