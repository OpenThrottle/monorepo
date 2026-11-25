/**
 * @description Rasterises the hero's `share` layout to `public/og-image.png`,
 * the 1200×630 image every page's og:image and twitter:image point at.
 *
 * The SVG comes from `renderHeroSvg` in `@openthrottle/openthrottle-product`,
 * the same renderer that draws the GitHub org profile hero, so the card never
 * drifts from it by hand. Headless Chromium draws it, as the marketing card
 * pipeline does (docs/marketing/assets/README.md § Rasterising), with Inter and
 * JetBrains Mono embedded from @fontsource so the result does not depend on the
 * fonts installed on the machine. Reduced motion is emulated, which leaves the
 * animated streaks at rest.
 *
 * Run `pnpm nx run openthrottle-website:generate-share-image` after changing
 * the hero, then commit the PNG.
 */
import { readFile, writeFile } from 'node:fs/promises';

import {
  HERO_GRAPHIC_LAYOUTS,
  renderHeroSvg,
} from '@openthrottle/openthrottle-product';
import { chromium } from 'playwright';

const PROJECT_ROOT = new URL('../', import.meta.url);
const OUTPUT_URL = new URL('public/og-image.png', PROJECT_ROOT);

const FONTS = [
  {
    family: 'Inter',
    file: '@fontsource/inter/files/inter-latin-400-normal.woff2',
    weight: 400,
  },
  {
    family: 'Inter',
    file: '@fontsource/inter/files/inter-latin-800-normal.woff2',
    weight: 800,
  },
  {
    family: 'JetBrains Mono',
    file: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    weight: 400,
  },
] as const;

const loadFontFaces = async (): Promise<string> => {
  const faces = FONTS.map(async (font) => {
    const url = new URL(`node_modules/${font.file}`, PROJECT_ROOT);
    const data = await readFile(url);

    return `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; src: url(data:font/woff2;base64,${data.toString('base64')}) format('woff2'); }`;
  });

  return (await Promise.all(faces)).join('\n');
};

const main = async (): Promise<void> => {
  const { height, width } = HERO_GRAPHIC_LAYOUTS.share;
  const fontFaces = await loadFontFaces();
  const svg = renderHeroSvg('dark', 'share');
  const html = `<!doctype html><html><head><style>${fontFaces}
html, body { margin: 0; padding: 0; }
svg { display: block; }
</style></head><body>${svg}</body></html>`;

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      viewport: { height, width },
    });

    await page.setContent(html);
    // Fonts load lazily on first use: ask for every face before drawing.
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load(`400 25px Inter`),
        document.fonts.load(`800 78px Inter`),
        document.fonts.load(`400 19px 'JetBrains Mono'`),
      ]);
      await document.fonts.ready;
    });

    const png = await page.screenshot({
      clip: { height, width, x: 0, y: 0 },
      type: 'png',
    });

    await writeFile(OUTPUT_URL, png);
    console.log(`Share image (${width}×${height}): ${OUTPUT_URL.pathname}`);
  } finally {
    await browser.close();
  }
};

await main();
