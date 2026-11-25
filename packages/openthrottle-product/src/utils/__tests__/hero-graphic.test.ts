import { describe, expect, it } from 'vitest';

import {
  HERO_GRAPHIC_COPY,
  HERO_GRAPHIC_ICON,
  HERO_GRAPHIC_LAYOUTS,
} from '../../data/hero-graphic';
import { PRODUCT_POSITIONING } from '../../data/positioning';
import { STATS_GRAPHIC_PALETTES } from '../../data/stats-graphic';
import { renderHeroAlt, renderHeroSvg } from '../hero-graphic';

describe('renderHeroAlt', () => {
  it('names the product and its short tagline', () => {
    expect(renderHeroAlt(PRODUCT_POSITIONING)).toBe(
      `OpenThrottle: ${PRODUCT_POSITIONING.tagline.short}`,
    );
  });
});

describe('renderHeroSvg', () => {
  describe('banner layout', () => {
    const svg = renderHeroSvg('dark', 'banner');

    it('is the 1280×360 org profile hero, rounded and bordered', () => {
      expect(svg).toContain('width="1280" height="360"');
      expect(svg).toContain('clip-path="url(#round)"');
      expect(svg).toContain('rx="15.5"');
    });

    it('draws the artwork unmoved', () => {
      expect(svg).toContain('transform="translate(0 0)"');
      expect(svg).toContain('cx="220" cy="180"');
    });
  });

  describe('share layout', () => {
    const svg = renderHeroSvg('dark', 'share');
    const { height, offsetX, offsetY, width } = HERO_GRAPHIC_LAYOUTS.share;

    it('is a 1200×630 card with no frame', () => {
      expect(svg).toContain(`width="${width}" height="${height}"`);
      expect(svg).not.toContain('clip-path="url(#round)"');
      expect(svg).not.toContain('rx="15.5"');
    });

    it('moves the artwork and its glow by the layout offset', () => {
      expect(svg).toContain(`transform="translate(${offsetX} ${offsetY})"`);
      expect(svg).toContain(`cx="${220 + offsetX}" cy="${180 + offsetY}"`);
    });

    it('runs the bottom bar along the canvas bottom', () => {
      expect(svg).toContain(`y="${height - 4}" width="${width}" height="4"`);
    });
  });

  describe('content', () => {
    it.each(['dark', 'light'] as const)(
      'carries the copy, icon and %s palette',
      (scheme) => {
        const svg = renderHeroSvg(scheme, 'banner');

        expect(svg).toContain(STATS_GRAPHIC_PALETTES[scheme].bg);
        expect(svg).toContain(HERO_GRAPHIC_COPY.brand);
        expect(svg).toContain(HERO_GRAPHIC_COPY.taglineLines[0]);
        expect(svg).toContain(HERO_GRAPHIC_COPY.taglineLines[1]);
        expect(svg.match(/<path d="M/g)).toHaveLength(
          HERO_GRAPHIC_ICON.paths.length + 1,
        );
      },
    );

    it('keeps the streak animation behind prefers-reduced-motion', () => {
      const svg = renderHeroSvg('dark', 'share');

      expect(svg).toContain('@media (prefers-reduced-motion: no-preference)');
      expect(svg.match(/class="streak s\d"/g)).toHaveLength(4);
    });
  });
});
