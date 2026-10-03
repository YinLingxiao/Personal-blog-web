export interface NoteCatalogItem { id: string; title: string; kind: string; category: string; tags: string[]; updatedAt: number }
export interface NoteCatalog { total: number; categories: { name: string; count: number }[]; items: NoteCatalogItem[] }
export function buildNoteCatalog(source: unknown): NoteCatalog;
