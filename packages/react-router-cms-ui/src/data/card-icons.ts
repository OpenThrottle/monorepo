import type { LucideIcon } from 'lucide-react';
import { Pencil, Rocket, Star, Sun, TriangleAlert } from 'lucide-react';

/**
 * @description The icon names a CMS author can pick for a `Card`, mapped to
 * their lucide-react icons.
 */
export const CARD_ICONS = {
  Pencil,
  Rocket,
  Star,
  Sun,
} as const satisfies Record<string, LucideIcon>;

/** @description Shown when CMS content names an icon that does not exist. */
export const CARD_FALLBACK_ICON: LucideIcon = TriangleAlert;
