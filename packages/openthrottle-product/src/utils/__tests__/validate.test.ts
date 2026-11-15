import { describe, expect, it } from 'vitest';

import { PRODUCT_POSITIONING } from '../../data/data.positioning';
import type { ProductFeature, ProductPositioning } from '../../types/product';
import { validateRegistry } from '../validate';

const valid: ProductFeature = {
  body: 'Body',
  evidence: { docs: [], planIds: [], prs: [1] },
  id: 'feature',
  name: 'Feature',
  oneLiner: 'One liner',
  pillar: 'memory',
  public: true,
  since: '2026-11-15',
  status: 'shipped',
};

describe('validateRegistry', () => {
  it('returns no problems for a valid registry', () => {
    expect(validateRegistry([valid], PRODUCT_POSITIONING)).toEqual([]);
  });

  it('flags a oneLiner over 120 characters', () => {
    const feature: ProductFeature = { ...valid, oneLiner: 'x'.repeat(121) };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([
      'feature: oneLiner is 121 chars (max 120)',
    ]);
  });

  it('flags a duplicate id', () => {
    expect(validateRegistry([valid, valid], PRODUCT_POSITIONING)).toEqual([
      'feature: duplicate id',
    ]);
  });

  it('flags a since that is not an ISO date', () => {
    const feature: ProductFeature = { ...valid, since: 'November' };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([
      'feature: since "November" is not YYYY-MM-DD',
    ]);
  });

  it('flags a short plan id', () => {
    const feature: ProductFeature = {
      ...valid,
      evidence: { docs: [], planIds: ['4bec3d8e'], prs: [] },
      status: 'planned',
    };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([
      'feature: plan id "4bec3d8e" is not a full UUID',
    ]);
  });

  it('flags canon copy over its length limits', () => {
    const positioning: ProductPositioning = {
      ...PRODUCT_POSITIONING,
      tagline: {
        ...PRODUCT_POSITIONING.tagline,
        medium: 'x'.repeat(161),
        short: 'x'.repeat(61),
      },
    };

    expect(validateRegistry([], positioning)).toEqual([
      'tagline: short form is 61 chars (max 60)',
      'tagline: medium form is 161 chars (max 160)',
    ]);
  });

  it('flags a pillar the canon does not define', () => {
    const positioning: ProductPositioning = {
      ...PRODUCT_POSITIONING,
      pillars: PRODUCT_POSITIONING.pillars.filter((pillar) => {
        return pillar.id !== 'memory';
      }),
    };

    expect(validateRegistry([valid], positioning)).toEqual([
      'feature: pillar "memory" is not in the canon',
    ]);
  });
});
