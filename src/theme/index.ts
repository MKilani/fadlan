import type { AppStyleId, Theme } from './types';
import type { Region } from './regions';
import { plain } from './themes/plain';
import { fantasy } from './themes/fantasy';

export const THEMES: Record<AppStyleId, Theme> = { plain, fantasy };

// Automatic style by region. Empty on purpose: every region uses Plain until regional styles exist.
// Later, for example:  'east-asia': 'inkwash',  'mediterranean-near-east': 'greek'
export const REGION_DEFAULT_APP: Partial<Record<Region, AppStyleId>> = {};
