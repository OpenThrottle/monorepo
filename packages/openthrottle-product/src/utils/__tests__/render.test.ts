import { describe, expect, it } from 'vitest';

import { PRODUCT_FEATURES } from '../../data/data.features';
import { PRODUCT_POSITIONING } from '../../data/data.positioning';
import { PRODUCT_PROJECTS } from '../../data/data.projects';
import { SURFACE_MARKERS } from '../../data/data.surfaces';
import type { ProductFeature } from '../../types/product';
import type { SurfaceInput } from '../../types/surfaces';
import {
  renderLinkedInBlock,
  renderOrgProfile,
  renderReadmeSection,
  replaceMarkedSection,
} from '../render';

const input: SurfaceInput = {
  features: PRODUCT_FEATURES,
  positioning: PRODUCT_POSITIONING,
  projects: PRODUCT_PROJECTS,
  repositoryUrl: 'https://github.com/OpenThrottle/monorepo',
  stats: {
    agentClis: ['Claude Code', 'Codex'],
    applications: 7,
    mergedPullRequests: 700,
    packages: 70,
  },
  syncedOn: '2026-11-15',
  websiteUrl: 'https://openthrottle.ai',
};

const privateFeatures = PRODUCT_FEATURES.filter((feature) => {
  return !feature.public;
});

describe('renderReadmeSection', () => {
  const section = renderReadmeSection(input);

  it('is wrapped in the markers', () => {
    expect(section.startsWith(SURFACE_MARKERS.start)).toBe(true);
    expect(section.endsWith(SURFACE_MARKERS.end)).toBe(true);
  });

  it('heads a block for every pillar, with its emoji', () => {
    for (const pillar of PRODUCT_POSITIONING.pillars) {
      expect(section).toContain(`### ${pillar.emoji} ${pillar.name}`);
    }
  });

  it('leads each landed entry with its emoji', () => {
    const [first] = PRODUCT_FEATURES.filter((feature) => {
      return feature.public && feature.status === 'shipped';
    });

    expect(section).toContain(`- ${first?.emoji} **[${first?.name}](`);
  });

  it('never renders a private entry', () => {
    expect(privateFeatures.length).toBeGreaterThan(0);

    for (const feature of privateFeatures) {
      expect(section).not.toContain(feature.oneLiner);
    }
  });

  it('carries no stats or dates, so it only changes with the registry', () => {
    expect(section).not.toContain('700');
    expect(section).not.toContain(input.syncedOn);
  });

  it('is identical across runs with different stats', () => {
    expect(renderReadmeSection({ ...input, stats: undefined })).toBe(section);
  });
});

describe('replaceMarkedSection', () => {
  const section = `${SURFACE_MARKERS.start}\nnew\n${SURFACE_MARKERS.end}`;

  it('replaces the content between the markers', () => {
    const document = `# Title\n\n${SURFACE_MARKERS.start}\nold\n${SURFACE_MARKERS.end}\n\nTail`;

    expect(replaceMarkedSection(document, section)).toEqual({
      document: `# Title\n\n${section}\n\nTail`,
      ok: true,
    });
  });

  it('fails when the markers are missing', () => {
    expect(replaceMarkedSection('# Title', section)).toEqual({
      ok: false,
      reason: 'markers not found',
    });
  });

  it('fails when a marker is duplicated', () => {
    const document = `${SURFACE_MARKERS.start}${SURFACE_MARKERS.start}${SURFACE_MARKERS.end}`;

    expect(replaceMarkedSection(document, section).ok).toBe(false);
  });

  it('fails when the markers are out of order', () => {
    const document = `${SURFACE_MARKERS.end}${SURFACE_MARKERS.start}`;

    expect(replaceMarkedSection(document, section)).toEqual({
      ok: false,
      reason: 'end marker comes before start marker',
    });
  });
});

describe('renderOrgProfile', () => {
  it('includes the computed stats when present', () => {
    expect(renderOrgProfile(input)).toContain('**700** pull requests merged');
  });

  it('omits the stats section when offline', () => {
    expect(renderOrgProfile({ ...input, stats: undefined })).not.toContain(
      'pull requests merged',
    );
  });

  it('heads each feature card with its emoji', () => {
    const profile = renderOrgProfile(input);
    const [first] = PRODUCT_FEATURES.filter((feature) => {
      return feature.public && feature.status === 'shipped';
    });

    expect(profile).toContain(`<h3>${first?.emoji} ${first?.name}</h3>`);
  });

  it('pads a short final row so every row has three cells', () => {
    const feature: ProductFeature = {
      body: 'Body',
      emoji: '🧪',
      evidence: { docs: [], planIds: [], prs: [1] },
      id: 'only',
      name: 'Only',
      oneLiner: 'The only card',
      pillar: 'memory',
      public: true,
      since: '2026-11-15',
      status: 'shipped',
    };
    const profile = renderOrgProfile({ ...input, features: [feature] });
    const cells = profile.match(/<td width="33%" valign="top">/g) ?? [];

    expect(cells).toHaveLength(3);
  });

  it('renders the project status table', () => {
    const profile = renderOrgProfile(input);

    expect(profile).toContain('## 🚦 Project status');
    expect(profile).toContain(
      '| `openthrottle-server` | ✅ Stable | NestJS code-first GraphQL API: the backbone of the platform. |',
    );
    expect(profile).toContain('| `openthrottle-admin` | 🧭 Planned |');
  });

  it('omits the project status section when there are no projects', () => {
    expect(renderOrgProfile({ ...input, projects: [] })).not.toContain(
      'Project status',
    );
  });

  it('never renders a private entry', () => {
    const profile = renderOrgProfile(input);

    for (const feature of privateFeatures) {
      expect(profile).not.toContain(feature.oneLiner);
    }
  });
});

describe('renderLinkedInBlock', () => {
  const block = renderLinkedInBlock(input);

  it('stamps the sync date', () => {
    expect(block).toContain('Last synced: 2026-11-15');
  });

  it('uses the short tagline as the headline', () => {
    expect(block).toContain(PRODUCT_POSITIONING.tagline.short);
  });

  it('leaves emoji off the pillar lines', () => {
    for (const pillar of PRODUCT_POSITIONING.pillars) {
      expect(block).toContain(`• ${pillar.name}: `);
      expect(block).not.toContain(pillar.emoji);
    }
  });

  it('writes stats as plain text', () => {
    expect(block).toContain('700 pull requests merged');
    expect(block).not.toContain('**');
  });
});
