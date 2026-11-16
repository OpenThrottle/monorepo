import { describe, expect, it } from 'vitest';

import { PRODUCT_POSITIONING } from '../../data/data.positioning';
import type { ProductFeature, ProductPositioning } from '../../types/product';
import { validateProjects, validateRegistry } from '../validate';

const valid: ProductFeature = {
  body: 'Body',
  emoji: '🧪',
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

  it('accepts a multi-codepoint emoji that is one grapheme', () => {
    const feature: ProductFeature = { ...valid, emoji: '🗓️' };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([]);
  });

  it('flags an empty emoji', () => {
    const feature: ProductFeature = { ...valid, emoji: '' };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([
      'feature: emoji is empty',
    ]);
  });

  it('flags an emoji that is more than one grapheme', () => {
    const feature: ProductFeature = { ...valid, emoji: '🧪🧠' };

    expect(validateRegistry([feature], PRODUCT_POSITIONING)).toEqual([
      'feature: emoji "🧪🧠" is 2 graphemes (max 1)',
    ]);
  });

  it('allows two entries to share an emoji', () => {
    const other: ProductFeature = { ...valid, id: 'other' };

    expect(validateRegistry([valid, other], PRODUCT_POSITIONING)).toEqual([]);
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

  it('flags a pillar emoji that is more than one grapheme', () => {
    const [first, ...rest] = PRODUCT_POSITIONING.pillars;
    const positioning: ProductPositioning = {
      ...PRODUCT_POSITIONING,
      pillars: [{ ...first, emoji: '' }, ...rest],
    };

    expect(validateRegistry([], positioning)).toEqual([
      `pillar ${first.id}: emoji is empty`,
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

describe('validateProjects', () => {
  const project = {
    name: 'openthrottle-server',
    path: 'applications/openthrottle-server',
    status: 'stable',
    summary: 'The API.',
  } as const;

  it('returns no problems for a valid list', () => {
    expect(validateProjects([project])).toEqual([]);
  });

  it('flags a duplicate name', () => {
    expect(validateProjects([project, project])).toEqual([
      'project openthrottle-server: duplicate name',
    ]);
  });

  it('flags a summary over 100 characters', () => {
    expect(
      validateProjects([{ ...project, summary: 'x'.repeat(101) }]),
    ).toEqual(['project openthrottle-server: summary is 101 chars (max 100)']);
  });

  it('flags a pipe that would break the table', () => {
    expect(validateProjects([{ ...project, summary: 'a | b' }])).toEqual([
      'project openthrottle-server: summary contains "|"',
    ]);
  });
});
