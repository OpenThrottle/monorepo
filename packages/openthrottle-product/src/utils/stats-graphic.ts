import {
  STATS_GRAPHIC_ADVANCE,
  STATS_GRAPHIC_COPY,
  STATS_GRAPHIC_FONTS,
  STATS_GRAPHIC_LAYOUT,
  STATS_GRAPHIC_PALETTES,
} from '../data/stats-graphic';
import { AGENT_CLI_DISPLAY_ORDER, AGENT_CLI_NAMES } from '../data/surfaces';
import type {
  StatsGraphicChip,
  StatsGraphicScheme,
  SurfaceStats,
} from '../types/surfaces';

/**
 * @description Display names for the given driver ids: the curated
 * `AGENT_CLI_DISPLAY_ORDER` first, then any other driver in the order given.
 * A driver with no display name renders its id.
 * @public
 */
export const getAgentCliNames = (
  driverIds: readonly string[],
): readonly string[] => {
  const known = AGENT_CLI_DISPLAY_ORDER.filter((id) => {
    return driverIds.includes(id);
  });
  const rest = driverIds.filter((id) => {
    return !AGENT_CLI_DISPLAY_ORDER.includes(id);
  });

  return [...known, ...rest].map((id) => {
    return AGENT_CLI_NAMES[id] ?? id;
  });
};

/** @public */
export const escapeXml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
};

const getAdvance = (char: string): number => {
  const { defaultLower, defaultUpper, narrow, roundUpper, semiNarrow, wide } =
    STATS_GRAPHIC_ADVANCE;

  for (const group of [narrow, semiNarrow, wide, roundUpper]) {
    if (group.chars.includes(char)) {
      return group.em;
    }
  }

  const isUpper = char !== char.toLowerCase();

  return isUpper ? defaultUpper : defaultLower;
};

/**
 * @description Approximate rendered width of semibold sans text, in user
 * units. Close enough to size a chip, not to typeset with.
 * @public
 */
export const measureText = (text: string, fontSize: number): number => {
  let em = 0;

  for (const char of text) {
    em += getAdvance(char);
  }

  return Math.round(em * fontSize);
};

/**
 * @description Lays out the agent chips left to right after the mono label.
 * @public
 */
export const getStatsGraphicChips = (
  agentClis: readonly string[],
): readonly StatsGraphicChip[] => {
  const layout = STATS_GRAPHIC_LAYOUT;
  const labelAdvance =
    layout.labelFontSize * layout.monoAdvance + layout.labelLetterSpacing;
  const labelWidth = Math.round(
    STATS_GRAPHIC_COPY.agentsLabel.length * labelAdvance,
  );
  const chips: StatsGraphicChip[] = [];
  let x = layout.margin + labelWidth + layout.labelGapAfter;

  for (const name of agentClis) {
    const textWidth = measureText(name, layout.chipFontSize);
    const width = layout.chipTextX + textWidth + layout.chipPaddingRight;

    chips.push({ name, width, x });
    x += width + layout.chipGap;
  }

  return chips;
};

const getStatBlocks = (
  stats: SurfaceStats,
): readonly (readonly [string, string])[] => {
  return [
    [`${stats.mergedPullRequests}+`, STATS_GRAPHIC_COPY.mergedPullRequests],
    [`${stats.packages}`, STATS_GRAPHIC_COPY.packages],
    [`${stats.applications}`, STATS_GRAPHIC_COPY.applications],
    [`${stats.agentClis.length}`, STATS_GRAPHIC_COPY.agentClis],
  ];
};

/**
 * @description The alt text for the stats graphic, carrying the same numbers
 * so the image is never the only place they appear.
 * @public
 */
export const renderStatsAlt = (stats: SurfaceStats): string => {
  const copy = STATS_GRAPHIC_COPY;
  const names = [...stats.agentClis];
  const last = names.pop() ?? '';
  const list = names.length > 0 ? `${names.join(', ')} and ${last}` : last;

  return [
    `${stats.mergedPullRequests}+ ${copy.altMergedPullRequests}`,
    `${stats.packages} ${copy.altPackages}`,
    `${stats.applications} ${copy.altApplications}`,
    `${stats.agentClis.length} ${copy.altAgents}: ${list}.`,
  ].join(', ');
};

/**
 * @description The stats card as a standalone SVG for one colour scheme.
 * Ported from OpenThrottle/.github `profile/assets/build.mjs`; the numbers
 * and agent names come from `stats`, never from this file.
 * @public
 */
export const renderStatsSvg = (
  stats: SurfaceStats,
  scheme: StatsGraphicScheme,
): string => {
  const p = STATS_GRAPHIC_PALETTES[scheme];
  const { chipFontSize, chipHeight, chipTextX, chipY, height, margin, width } =
    STATS_GRAPHIC_LAYOUT;
  const blocks = getStatBlocks(stats);
  const columnWidth = (width - margin * 2) / blocks.length;
  const chipRadius = chipHeight / 2;
  const chipMiddle = chipY + chipRadius;

  const blockMarkup = blocks.map(([value, label], index) => {
    const x = margin + index * columnWidth;

    return [
      `<rect x="${x}" y="40" width="28" height="4" rx="2" fill="${p.red}"/>`,
      `<text class="sans" x="${x}" y="116" font-size="68" font-weight="800" letter-spacing="-1.5" fill="${p.fg}">${escapeXml(value)}</text>`,
      `<text class="sans" x="${x}" y="152" font-size="24" fill="${p.muted}">${escapeXml(label)}</text>`,
    ].join('\n  ');
  });

  const chipMarkup = getStatsGraphicChips(stats.agentClis).map((chip) => {
    return [
      `<rect x="${chip.x}" y="${chipY}" width="${chip.width}" height="${chipHeight}" rx="${chipRadius}" fill="${p.card}" stroke="${p.border}"/>`,
      `<circle cx="${chip.x + 20}" cy="${chipMiddle}" r="4.5" fill="${p.red}"/>`,
      `<text class="sans" x="${chip.x + chipTextX}" y="${chipMiddle + 7}" font-size="${chipFontSize}" font-weight="600" fill="${p.fg}">${escapeXml(chip.name)}</text>`,
    ].join('\n  ');
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img">
<style>
  .sans { font-family: ${STATS_GRAPHIC_FONTS.sans}; }
  .mono { font-family: ${STATS_GRAPHIC_FONTS.mono}; }
</style>
<defs>
  <clipPath id="round"><rect width="${width}" height="${height}" rx="16"/></clipPath>
</defs>
<g clip-path="url(#round)">
  <rect width="${width}" height="${height}" fill="${p.bg}"/>
  <line x1="${margin}" y1="186" x2="${width - margin}" y2="186" stroke="${p.border}"/>
  ${blockMarkup.join('\n  ')}
  <text class="mono" x="${margin}" y="239" font-size="16" letter-spacing="2.5" fill="${p.muted}">${escapeXml(STATS_GRAPHIC_COPY.agentsLabel)}</text>
  ${chipMarkup.join('\n  ')}
</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="15.5" stroke="${p.border}"/>
</svg>
`;
};
