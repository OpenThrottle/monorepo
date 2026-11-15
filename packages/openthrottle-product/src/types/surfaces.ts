import type { ProductFeature, ProductPositioning } from './product';

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
