import type { HeroGraphicLayoutKey } from '../data/hero-graphic';
import {
  HERO_GRAPHIC_COPY,
  HERO_GRAPHIC_GLOW,
  HERO_GRAPHIC_ICON,
  HERO_GRAPHIC_LAYOUTS,
  HERO_GRAPHIC_STREAKS,
} from '../data/hero-graphic';
import {
  STATS_GRAPHIC_FONTS,
  STATS_GRAPHIC_PALETTES,
} from '../data/stats-graphic';
import type { ProductPositioning } from '../types/product';
import type { StatsGraphicScheme } from '../types/surfaces';
import { escapeXml } from './stats-graphic';

/** @description The hero artwork's own width, in banner coordinates. */
const ARTWORK_WIDTH = 1280;

/**
 * @description The hero's alt text, shared by the org profile and the
 * website's share card.
 * @public
 */
export const renderHeroAlt = (positioning: ProductPositioning): string => {
  return `OpenThrottle: ${positioning.tagline.short}`;
};

const renderLoopLine = (red: string): string => {
  const { loop, loopEnd, loopSeparator } = HERO_GRAPHIC_COPY;
  const separator = ` <tspan fill="${red}">${loopSeparator}</tspan> `;

  return `${loop.join(separator)} <tspan fill="${red}">${loopEnd}</tspan>`;
};

const renderIcon = (): string => {
  const { fill, paths, viewBox } = HERO_GRAPHIC_ICON;
  const markup = paths.map((d) => {
    return `<path d="${d}" fill="${fill}"/>`;
  });

  return `<svg x="92" y="52" width="256" height="256" viewBox="0 0 ${viewBox} ${viewBox}">
    ${markup.join('\n    ')}
  </svg>`;
};

/**
 * @description The hero as a standalone SVG for one colour scheme and one
 * canvas. Ported from OpenThrottle/.github `profile/assets/build.mjs`: the
 * artwork is drawn in banner coordinates and moved onto the canvas by the
 * layout's offset, while the background, grid, glow and bottom bar span the
 * whole canvas. The streaks animate in only when motion is allowed, so a
 * renderer that honours `prefers-reduced-motion: reduce` gets them at rest.
 * @public
 */
export const renderHeroSvg = (
  scheme: StatsGraphicScheme,
  layoutKey: HeroGraphicLayoutKey,
): string => {
  const p = STATS_GRAPHIC_PALETTES[scheme];
  const glow = HERO_GRAPHIC_GLOW[scheme];
  const { framed, height, offsetX, offsetY, width } =
    HERO_GRAPHIC_LAYOUTS[layoutKey];
  const copy = HERO_GRAPHIC_COPY;
  const [firstLine, secondLine] = copy.taglineLines;

  const streaks = HERO_GRAPHIC_STREAKS.map(([y, length, opacity], index) => {
    const x = ARTWORK_WIDTH - 60 - length;

    return `<rect class="streak s${index}" x="${x}" y="${y}" width="${length}" height="3" rx="1.5" fill="url(#streak)" opacity="${opacity}"/>`;
  });

  const clipOpen = framed ? '<g clip-path="url(#round)">' : '<g>';
  const clipPath = framed
    ? `<clipPath id="round"><rect width="${width}" height="${height}" rx="16"/></clipPath>`
    : '';
  const border = framed
    ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="15.5" stroke="${p.border}"/>\n`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img">
<style>
  .sans { font-family: ${STATS_GRAPHIC_FONTS.sans}; }
  .mono { font-family: ${STATS_GRAPHIC_FONTS.mono}; }
  @media (prefers-reduced-motion: no-preference) {
    .streak { animation: zip 2.2s cubic-bezier(.22,1,.36,1) both; }
    .s1 { animation-delay: .15s; } .s2 { animation-delay: .3s; }
    .s3 { animation-delay: .45s; } .s4 { animation-delay: .6s; }
  }
  @keyframes zip {
    0% { transform: translateX(-140px); opacity: 0; }
    100% { transform: translateX(0); }
  }
</style>
<defs>
  ${clipPath}
  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
    <path d="M32 0H0V32" stroke="${p.grid}" stroke-width="1"/>
  </pattern>
  <radialGradient id="glow" cx="${220 + offsetX}" cy="${180 + offsetY}" r="260" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${p.red}" stop-opacity="${glow}"/>
    <stop offset="1" stop-color="${p.red}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="streak" x1="0" x2="1">
    <stop offset="0" stop-color="${p.red}" stop-opacity="0"/>
    <stop offset="1" stop-color="${p.red}"/>
  </linearGradient>
  <linearGradient id="fade" x1="0" x2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="1"/>
    <stop offset=".75" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="gridmask"><rect width="${width}" height="${height}" fill="url(#fade)"/></mask>
</defs>
${clipOpen}
  <rect width="${width}" height="${height}" fill="${p.bg}"/>
  <rect width="${width}" height="${height}" fill="url(#grid)" mask="url(#gridmask)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <g transform="translate(${offsetX} ${offsetY})">
  ${streaks.join('\n  ')}
  ${renderIcon()}
  <text class="mono" x="380" y="112" font-size="17" letter-spacing="3" fill="${p.red}">${escapeXml(copy.eyebrow)}</text>
  <text class="sans" x="376" y="186" font-size="78" font-weight="800" letter-spacing="-2.5" fill="${p.fg}">${escapeXml(copy.brand)}<tspan fill="${p.red}">${escapeXml(copy.brandSuffix)}</tspan></text>
  <text class="sans" x="380" y="236" font-size="25" fill="${p.muted}">${escapeXml(firstLine)}</text>
  <text class="sans" x="380" y="270" font-size="25" fill="${p.muted}">${escapeXml(secondLine)}</text>
  <text class="mono" x="380" y="320" font-size="19" fill="${p.fg}">${renderLoopLine(p.red)}</text>
  </g>
  <rect x="0" y="${height - 4}" width="${width}" height="4" fill="${p.red}" opacity=".9"/>
</g>
${border}</svg>
`;
};
