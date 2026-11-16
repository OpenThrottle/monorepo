import type {
  ProductFeature,
  ProductPositioning,
  ProductProject,
} from './product';

/**
 * @description Numbers computed at generate time (never typed by hand). Absent
 * when the generator runs offline, in which case renderers omit the stats.
 * @public
 */
export interface SurfaceStats {
  readonly agentClis: readonly string[];
  readonly applications: number;
  readonly mergedPullRequests: number;
  readonly packages: number;
}

/**
 * @description Everything a renderer reads. Renderers are pure functions of
 * this, so a new output is a new renderer, never a new source.
 * @public
 */
export interface SurfaceInput {
  readonly features: readonly ProductFeature[];
  readonly positioning: ProductPositioning;
  /** The org profile's project status table, in display order. */
  readonly projects: readonly ProductProject[];
  readonly repositoryUrl: string;
  readonly stats: SurfaceStats | undefined;
  /** ISO date (YYYY-MM-DD) stamped on outputs that carry a "last synced" line. */
  readonly syncedOn: string;
  readonly websiteUrl: string;
}

/** @public */
export type ReplaceSectionResult =
  | { readonly document: string; readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * @description A colour scheme of the stats graphic; one SVG is written per
 * scheme and selected with `<picture>` + `prefers-color-scheme`.
 * @public
 */
export type StatsGraphicScheme = 'dark' | 'light';

/**
 * @description One "bring your own agent" chip, positioned on the card.
 * @public
 */
export interface StatsGraphicChip {
  readonly name: string;
  readonly width: number;
  readonly x: number;
}
