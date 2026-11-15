import type {
  InFlightProductFeature,
  PlannedProductFeature,
  PreviewProductFeature,
  ProductFeature,
  ProductPillarId,
  ShippedProductFeature,
} from '../types/product';

/** @public */
export type LandedProductFeature =
  PreviewProductFeature | ShippedProductFeature;

/** @public */
export type UpcomingProductFeature =
  InFlightProductFeature | PlannedProductFeature;

/**
 * @description `shipped` and `preview` entries: what a user can run today.
 * @public
 */
export const isLandedFeature = (
  feature: ProductFeature,
): feature is LandedProductFeature => {
  return feature.status === 'shipped' || feature.status === 'preview';
};

/**
 * @description `in-flight` and `planned` entries: the roadmap.
 * @public
 */
export const isUpcomingFeature = (
  feature: ProductFeature,
): feature is UpcomingProductFeature => {
  return feature.status === 'in-flight' || feature.status === 'planned';
};

/**
 * @description Only entries the owner has approved for public surfaces.
 * @public
 */
export const getPublicFeatures = (
  features: readonly ProductFeature[],
): ProductFeature[] => {
  return features.filter((feature) => {
    return feature.public;
  });
};

/** @public */
export const getFeaturesByPillar = (
  features: readonly ProductFeature[],
  pillar: ProductPillarId,
): ProductFeature[] => {
  return features.filter((feature) => {
    return feature.pillar === pillar;
  });
};

/**
 * @description The "learn more" URL for an entry: its first doc, else its
 * first pull request, else the repository root. `repositoryUrl` is passed in
 * (e.g. `OPENTHROTTLE_GITHUB_URL_MONOREPO`) so this package stays
 * dependency-free.
 * @public
 */
export const getFeatureLink = (
  feature: ProductFeature,
  repositoryUrl: string,
): string => {
  const [doc] = feature.evidence.docs;
  const [pr] = feature.evidence.prs;

  if (doc !== undefined) {
    return `${repositoryUrl}/blob/main/${doc}`;
  }

  if (pr !== undefined) {
    return `${repositoryUrl}/pull/${pr}`;
  }

  return repositoryUrl;
};
