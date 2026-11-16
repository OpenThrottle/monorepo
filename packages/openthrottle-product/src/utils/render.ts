import {
  LINKEDIN_COPY,
  ORG_PROFILE_COPY,
  README_SECTION_COPY,
  SURFACE_BANNER,
  SURFACE_MARKERS,
} from '../data/data.surfaces';
import type { ProductFeature } from '../types/product';
import type {
  ReplaceSectionResult,
  SurfaceInput,
  SurfaceStats,
} from '../types/surfaces';
import {
  getFeatureLink,
  getFeaturesByPillar,
  getPublicFeatures,
  isLandedFeature,
  isUpcomingFeature,
} from './features';

const ORG_PROFILE_COLUMNS = 3;

const getLanded = (input: SurfaceInput): ProductFeature[] => {
  return getPublicFeatures(input.features).filter(isLandedFeature);
};

/**
 * @description In-flight entries first, then planned, registry order within
 * each.
 */
const getRoadmap = (input: SurfaceInput): ProductFeature[] => {
  const upcoming = getPublicFeatures(input.features).filter(isUpcomingFeature);

  return [
    ...upcoming.filter((feature) => {
      return feature.status === 'in-flight';
    }),
    ...upcoming.filter((feature) => {
      return feature.status === 'planned';
    }),
  ];
};

const formatStats = (stats: SurfaceStats): string => {
  const clis = stats.agentClis.join(', ');

  return [
    `**${stats.mergedPullRequests}** pull requests merged`,
    `**${stats.packages}** packages`,
    `**${stats.applications}** applications`,
    `**${stats.agentClis.length}** agent CLIs: ${clis}`,
  ].join(' · ');
};

/**
 * @description The marker-delimited section of the root README.md. It carries
 * no stats and no dates, so it only changes when the registry does, and the
 * drift gate can compare it byte for byte.
 * @public
 */
export const renderReadmeSection = (input: SurfaceInput): string => {
  const landed = getLanded(input);
  const lines: string[] = [
    SURFACE_MARKERS.start,
    SURFACE_BANNER,
    '',
    input.positioning.tagline.long,
  ];

  for (const pillar of input.positioning.pillars) {
    const features = getFeaturesByPillar(landed, pillar.id);

    lines.push(
      '',
      `${README_SECTION_COPY.pillarHeading} ${pillar.emoji} ${pillar.name}`,
      '',
    );
    lines.push(pillar.medium, '');

    for (const feature of features) {
      const link = getFeatureLink(feature, input.repositoryUrl);
      const status = feature.status === 'preview' ? ' _(preview)_' : '';

      lines.push(
        `- ${feature.emoji} **[${feature.name}](${link})**${status}: ${feature.oneLiner}`,
      );
    }
  }

  const roadmap = getRoadmap(input);

  if (roadmap.length > 0) {
    lines.push('', README_SECTION_COPY.roadmapTitle, '');

    for (const feature of roadmap) {
      const label = README_SECTION_COPY.statusLabels[feature.status];

      lines.push(`- **${feature.name}** _(${label})_: ${feature.oneLiner}`);
    }
  }

  lines.push('', SURFACE_MARKERS.end);

  return lines.join('\n');
};

/**
 * @description Replaces the marker-delimited section of `document` with
 * `section` (which carries its own markers). Fails when the markers are
 * missing, duplicated or out of order rather than guessing where to write.
 * @public
 */
export const replaceMarkedSection = (
  document: string,
  section: string,
): ReplaceSectionResult => {
  const start = document.indexOf(SURFACE_MARKERS.start);
  const end = document.indexOf(SURFACE_MARKERS.end);
  const hasDuplicate =
    document.indexOf(SURFACE_MARKERS.start, start + 1) !== -1 ||
    document.indexOf(SURFACE_MARKERS.end, end + 1) !== -1;

  if (start === -1 || end === -1) {
    return { ok: false, reason: 'markers not found' };
  }

  if (hasDuplicate) {
    return { ok: false, reason: 'markers appear more than once' };
  }

  if (end < start) {
    return { ok: false, reason: 'end marker comes before start marker' };
  }

  const before = document.slice(0, start);
  const after = document.slice(end + SURFACE_MARKERS.end.length);

  return { document: `${before}${section}${after}`, ok: true };
};

const renderOrgProfileHeader = (input: SurfaceInput): string[] => {
  const { repositoryUrl, websiteUrl } = input;
  const alt = `OpenThrottle: ${input.positioning.tagline.short}`;

  return [
    '<p align="center">',
    `  <a href="${websiteUrl}">`,
    '    <picture>',
    '      <source media="(prefers-color-scheme: dark)" srcset="./assets/hero-dark.svg">',
    '      <source media="(prefers-color-scheme: light)" srcset="./assets/hero-light.svg">',
    `      <img src="./assets/hero-dark.svg" alt="${alt}" width="100%">`,
    '    </picture>',
    '  </a>',
    '</p>',
    '',
    '<p align="center">',
    `  <a href="${websiteUrl}"><img alt="Website" src="https://img.shields.io/badge/openthrottle.ai-FF0000?style=for-the-badge&logo=speedtest&logoColor=white"></a>`,
    `  <a href="${repositoryUrl}"><img alt="Monorepo" src="https://img.shields.io/badge/monorepo-0A0D0F?style=for-the-badge&logo=github&logoColor=white"></a>`,
    `  <a href="${repositoryUrl}/actions/workflows/continuous-integration.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/OpenThrottle/monorepo/continuous-integration.yml?branch=main&style=for-the-badge&label=CI"></a>`,
    `  <a href="${repositoryUrl}/blob/main/LICENSE.md"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-20262D?style=for-the-badge"></a>`,
    '</p>',
  ];
};

const renderOrgProfileTable = (input: SurfaceInput): string[] => {
  const landed = getLanded(input);
  const lines: string[] = ['<table>'];

  for (let index = 0; index < landed.length; index += ORG_PROFILE_COLUMNS) {
    const row = landed.slice(index, index + ORG_PROFILE_COLUMNS);

    lines.push('  <tr>');

    for (const feature of row) {
      const preview =
        feature.status === 'preview' ? ' <sub><code>preview</code></sub>' : '';

      lines.push('    <td width="33%" valign="top">');
      lines.push(`      <h3>${feature.emoji} ${feature.name}${preview}</h3>`);
      lines.push(`      ${feature.oneLiner}`);
      lines.push('    </td>');
    }

    // Pad a short final row so GitHub keeps every column at a third.
    for (let empty = row.length; empty < ORG_PROFILE_COLUMNS; empty += 1) {
      lines.push('    <td width="33%" valign="top"></td>');
    }

    lines.push('  </tr>');
  }

  lines.push('</table>');

  return lines;
};

const renderOrgProfileProjects = (input: SurfaceInput): string[] => {
  const rows = input.projects.map((project) => {
    const status = ORG_PROFILE_COPY.projectStatusLabels[project.status];

    return `| \`${project.name}\` | ${status} | ${project.summary} |`;
  });

  return [...ORG_PROFILE_COPY.projectsHeader, ...rows];
};

/**
 * @description The OpenThrottle/.github org profile README. Written to a local
 * file; publishing it is a separate, owner-approved PR.
 * @public
 */
export const renderOrgProfile = (input: SurfaceInput): string => {
  const { positioning, stats } = input;
  const roadmap = getRoadmap(input);
  const lines: string[] = [
    SURFACE_BANNER,
    '',
    ...renderOrgProfileHeader(input),
    '',
    `**${positioning.tagline.medium}** ${positioning.lede.long}`,
    '',
    '<p align="center">',
    '  <picture>',
    '    <source media="(prefers-color-scheme: dark)" srcset="./assets/loop-dark.svg">',
    '    <source media="(prefers-color-scheme: light)" srcset="./assets/loop-light.svg">',
    '    <img src="./assets/loop-dark.svg" alt="The loop: Plan, Run, Validate, Ship, Remember, then back to Plan." width="100%">',
    '  </picture>',
    '</p>',
    '',
    ORG_PROFILE_COPY.featuresTitle,
    '',
    ...renderOrgProfileTable(input),
  ];

  if (stats !== undefined) {
    lines.push('', ORG_PROFILE_COPY.statsTitle, '', formatStats(stats));
  }

  if (roadmap.length > 0) {
    lines.push('', ORG_PROFILE_COPY.roadmapTitle, '', positioning.closing, '');

    for (const feature of roadmap) {
      lines.push(`- **${feature.name}.** ${feature.oneLiner}`);
    }
  }

  if (input.projects.length > 0) {
    lines.push(
      '',
      ORG_PROFILE_COPY.projectsTitle,
      '',
      ...renderOrgProfileProjects(input),
    );
  }

  lines.push(
    '',
    ORG_PROFILE_COPY.quickstartTitle,
    '',
    '```bash',
    ...ORG_PROFILE_COPY.quickstart,
    '```',
    '',
    ORG_PROFILE_COPY.quickstartAfter,
    '',
    '<details>',
    `<summary><b>${ORG_PROFILE_COPY.builtWithTitle}</b></summary>`,
    '<br>',
    '',
    ORG_PROFILE_COPY.builtWith,
    '',
    '</details>',
    '',
    ORG_PROFILE_COPY.openSourceTitle,
    '',
    ORG_PROFILE_COPY.openSource,
    '',
    ORG_PROFILE_COPY.openSourceHelp,
    '',
    ORG_PROFILE_COPY.footer,
    '',
  );

  return lines.join('\n');
};

/**
 * @description A plain-text block to paste into LinkedIn by hand (headline,
 * about, featured), stamped with the date it was generated.
 * @public
 */
export const renderLinkedInBlock = (input: SurfaceInput): string => {
  const { positioning, repositoryUrl, stats, syncedOn, websiteUrl } = input;
  const lines: string[] = [
    LINKEDIN_COPY.title,
    '',
    `${LINKEDIN_COPY.syncedLabel}: ${syncedOn}`,
    '',
    `## ${LINKEDIN_COPY.headlineTitle}`,
    '',
    positioning.tagline.short,
    '',
    `## ${LINKEDIN_COPY.aboutTitle}`,
    '',
    positioning.tagline.long,
    '',
  ];

  for (const pillar of positioning.pillars) {
    lines.push(`• ${pillar.name}: ${pillar.medium}`);
  }

  if (stats !== undefined) {
    lines.push('', formatStats(stats).replaceAll('**', ''));
  }

  lines.push(
    '',
    `## ${LINKEDIN_COPY.featuredTitle}`,
    '',
    `- ${websiteUrl}`,
    `- ${repositoryUrl}`,
    '',
  );

  return lines.join('\n');
};
