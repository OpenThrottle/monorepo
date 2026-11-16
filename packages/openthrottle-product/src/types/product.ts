/**
 * @description Types for the positioning canon and the feature registry. The
 * registry entry is a discriminated union on `status`, so the compiler refuses
 * a `shipped` entry with no merged PR and a `planned` entry with no plan.
 */

/** @public */
export type ProductPillarId = 'history' | 'local' | 'memory' | 'runners';

/** @public */
export type ProductFeatureStatus =
  'in-flight' | 'planned' | 'preview' | 'shipped';

/**
 * @description One piece of copy at the three lengths every surface picks from.
 * `short` is at most 60 characters and `medium` at most 160; `long` is one
 * paragraph.
 * @public
 */
export interface ProductCopy {
  readonly long: string;
  readonly medium: string;
  readonly short: string;
}

/** @public */
export interface ProductPillar extends ProductCopy {
  /** A single emoji (one grapheme) for decorative headings; surfaces may ignore it. */
  readonly emoji: string;
  readonly id: ProductPillarId;
  readonly name: string;
}

/** @public */
export interface ProductPositioning {
  readonly closing: string;
  readonly lede: ProductCopy;
  readonly pillars: readonly ProductPillar[];
  readonly tagline: ProductCopy;
}

type NonEmpty<T> = readonly [T, ...T[]];

/**
 * @description Where a claim comes from. `docs` are repo-relative paths, `prs`
 * are `OpenThrottle/monorepo` pull request numbers and `planIds` are
 * OpenThrottle plan UUIDs.
 * @public
 */
export interface ProductFeatureEvidence {
  readonly docs: readonly string[];
  readonly planIds: readonly string[];
  readonly prs: readonly number[];
}

/** @public */
export interface LandedFeatureEvidence extends ProductFeatureEvidence {
  readonly prs: NonEmpty<number>;
}

/** @public */
export interface UpcomingFeatureEvidence extends ProductFeatureEvidence {
  readonly planIds: NonEmpty<string>;
}

interface ProductFeatureBase {
  readonly body: string;
  /**
   * A single emoji (one grapheme) for decorative headings on text surfaces.
   * Surfaces may ignore it; UI layers key their icons on `id` instead.
   */
  readonly emoji: string;
  readonly id: string;
  readonly name: string;
  /** At most 120 characters. */
  readonly oneLiner: string;
  readonly pillar: ProductPillarId;
  /** Shown on public surfaces only when the owner has approved the entry. */
  readonly public: boolean;
  /** ISO date (YYYY-MM-DD) the entry reached its current status. */
  readonly since: string;
}

/** @public */
export interface ShippedProductFeature extends ProductFeatureBase {
  readonly evidence: LandedFeatureEvidence;
  readonly status: 'shipped';
}

/** @public */
export interface PreviewProductFeature extends ProductFeatureBase {
  readonly evidence: LandedFeatureEvidence;
  readonly status: 'preview';
}

/** @public */
export interface InFlightProductFeature extends ProductFeatureBase {
  readonly evidence: UpcomingFeatureEvidence;
  readonly status: 'in-flight';
}

/** @public */
export interface PlannedProductFeature extends ProductFeatureBase {
  readonly evidence: UpcomingFeatureEvidence;
  readonly status: 'planned';
}

/** @public */
export type ProductFeature =
  | InFlightProductFeature
  | PlannedProductFeature
  | PreviewProductFeature
  | ShippedProductFeature;

/** @public */
export type ProductProjectStatus = 'experimental' | 'planned' | 'stable';

/**
 * @description A workspace project shown in the org profile's status table.
 * Nx tags carry no maturity signal (every app is `production:true`), so the
 * status is declared here and `check-surfaces` verifies `path` exists.
 * @public
 */
export interface ProductProject {
  /** Display name, usually the Nx project name. */
  readonly name: string;
  /** Repo-relative directory of the project. */
  readonly path: string;
  readonly status: ProductProjectStatus;
  /** One short sentence; Markdown links allowed. At most 100 characters. */
  readonly summary: string;
}
