import type { ArticleRef } from './types';

// Placeholder. Today everything is free. Later this is the single place that decides whether the
// reader may open premium content (active subscription, purchased city pack, creator's own access...).
export function canRead(article: ArticleRef): boolean {
  return article.access === 'free';
}
