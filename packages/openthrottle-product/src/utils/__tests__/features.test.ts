import { describe, expect, it } from 'vitest';

import type { ProductFeature } from '../../types/product';
import {
  getFeatureLink,
  getFeaturesByPillar,
  getPublicFeatures,
  isLandedFeature,
  isUpcomingFeature,
} from '../features';

const base = {
  body: 'Body',
  name: 'Name',
  oneLiner: 'One liner',
  since: '2026-11-15',
} as const;

const shipped: ProductFeature = {
  ...base,
  evidence: { docs: [], planIds: [], prs: [1] },
  id: 'shipped',
  pillar: 'memory',
  public: true,
  status: 'shipped',
};

const preview: ProductFeature = {
  ...base,
  evidence: { docs: [], planIds: [], prs: [2] },
  id: 'preview',
  pillar: 'history',
  public: false,
  status: 'preview',
};

const inFlight: ProductFeature = {
  ...base,
  evidence: { docs: [], planIds: ['plan-a'], prs: [] },
  id: 'in-flight',
  pillar: 'runners',
  public: true,
  status: 'in-flight',
};

const planned: ProductFeature = {
  ...base,
  evidence: { docs: [], planIds: ['plan-b'], prs: [] },
  id: 'planned',
  pillar: 'memory',
  public: false,
  status: 'planned',
};

const all = [shipped, preview, inFlight, planned];

describe('isLandedFeature', () => {
  it('accepts shipped and preview entries', () => {
    expect(all.filter(isLandedFeature)).toEqual([shipped, preview]);
  });
});

describe('isUpcomingFeature', () => {
  it('accepts in-flight and planned entries', () => {
    expect(all.filter(isUpcomingFeature)).toEqual([inFlight, planned]);
  });
});

describe('getPublicFeatures', () => {
  it('drops entries that are not public', () => {
    expect(getPublicFeatures(all)).toEqual([shipped, inFlight]);
  });

  it('returns an empty list when nothing is public', () => {
    expect(getPublicFeatures([preview, planned])).toEqual([]);
  });
});

describe('getFeaturesByPillar', () => {
  it('keeps only the requested pillar, in order', () => {
    expect(getFeaturesByPillar(all, 'memory')).toEqual([shipped, planned]);
  });

  it('returns an empty list for a pillar with no entries', () => {
    expect(getFeaturesByPillar(all, 'local')).toEqual([]);
  });
});

describe('getFeatureLink', () => {
  const repo = 'https://github.com/OpenThrottle/monorepo';

  it('links the first doc when there is one', () => {
    const feature: ProductFeature = {
      ...shipped,
      evidence: { docs: ['docs/a.md', 'docs/b.md'], planIds: [], prs: [9] },
    };

    expect(getFeatureLink(feature, repo)).toBe(`${repo}/blob/main/docs/a.md`);
  });

  it('falls back to the first pull request', () => {
    expect(getFeatureLink(shipped, repo)).toBe(`${repo}/pull/1`);
  });

  it('falls back to the repository root', () => {
    expect(getFeatureLink(inFlight, repo)).toBe(repo);
  });
});
