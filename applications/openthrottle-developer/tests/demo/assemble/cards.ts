/**
 * @description Rasterise the SVG cards from `docs/marketing/assets/`.
 *
 * Rendered in headless Chromium rather than with librsvg: no SVG rasteriser is
 * present on a default host, Chromium is already a pipeline dependency, and the
 * cards then rasterise with the same font stack and hinting as the footage they sit
 * on top of. A card rendered by a different engine visibly disagrees with the app's
 * type.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

import { repositoryRoot } from '../runner/format';

export interface CardRequest {
  /** ALL_CAPS placeholder -> replacement, per docs/marketing/assets/README.md. */
  readonly substitutions: Readonly<Record<string, string>>;
  /** File name under docs/marketing/assets, e.g. 'outro-card.svg'. */
  readonly svg: string;
  readonly transparent: boolean;
}

export interface CardTarget {
  readonly height: number;
  readonly outputPath: string;
  readonly width: number;
}

export const renderCards = async (
  jobs: readonly (CardRequest & CardTarget)[],
): Promise<void> => {
  if (jobs.length === 0) {
    return;
  }

  const browser = await chromium.launch();

  try {
    /* eslint-disable no-await-in-loop -- one page per card; they are cheap and few */
    for (const job of jobs) {
      const source = readFileSync(
        join(repositoryRoot(), 'docs', 'marketing', 'assets', job.svg),
        'utf8',
      );

      let svg = source;

      for (const [placeholder, value] of Object.entries(job.substitutions)) {
        svg = svg.replaceAll(placeholder, value);
      }

      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: job.height, width: job.width },
      });

      // A transparent card must not inherit a white page background, and the SVG's
      // own viewBox must fill the shot exactly or the overlay lands off-register.
      await page.setContent(
        `<!doctype html><style>
           html,body{margin:0;padding:0;background:${job.transparent ? 'transparent' : '#0A0D0F'}}
           svg{display:block;width:${String(job.width)}px;height:${String(job.height)}px}
         </style>${svg}`,
        { waitUntil: 'load' },
      );

      await page.screenshot({
        omitBackground: job.transparent,
        path: job.outputPath,
      });
      await page.close();
    }
    /* eslint-enable no-await-in-loop */
  } finally {
    await browser.close();
  }
};

export interface CaptionPlate {
  readonly endSeconds: number;
  readonly path: string;
  readonly startSeconds: number;
}

/**
 * Render each caption cue as a full-frame transparent PNG.
 *
 * Why not `subtitles` or `drawtext`: this host's ffmpeg is built without libass AND
 * without libfreetype, so it has neither filter — `ffmpeg -filters` lists only
 * `overlay` out of the text-capable set. Rather than making the pipeline depend on a
 * custom ffmpeg build, captions are typeset in the same headless Chromium that
 * renders the cards and composited with `overlay`.
 *
 * That turns out to be the better design anyway: captions get the same font stack as
 * the footage and the cards, and the safe area is honoured in CSS instead of an ASS
 * margin that has to be reverse-engineered.
 */
export const renderCaptionPlates = async (
  cues: readonly {
    readonly endSeconds: number;
    readonly startSeconds: number;
    readonly text: string;
  }[],
  options: {
    readonly background: string;
    readonly bottomSafeFraction: number;
    readonly font: string;
    readonly foreground: string;
    readonly height: number;
    readonly outputDir: string;
    readonly width: number;
  },
): Promise<readonly CaptionPlate[]> => {
  if (cues.length === 0) {
    return [];
  }

  const browser = await chromium.launch();
  const plates: CaptionPlate[] = [];

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: options.height, width: options.width },
    });

    /* eslint-disable no-await-in-loop -- one screenshot per cue, sequential by design */
    for (const [index, cue] of cues.entries()) {
      const path = join(
        options.outputDir,
        `caption-${String(index + 1).padStart(3, '0')}.png`,
      );
      const bottom =
        Math.round(options.height * options.bottomSafeFraction) + 32;

      await page.setContent(
        `<!doctype html><style>
           html,body{margin:0;padding:0;background:transparent;height:${String(options.height)}px}
           .wrap{position:absolute;left:6%;right:6%;bottom:${String(bottom)}px;display:flex;justify-content:center}
           .cue{font-family:${options.font};font-size:44px;font-weight:700;line-height:1.28;
             color:${options.foreground};background:${options.background}e6;padding:18px 26px;border-radius:12px;
             text-align:center;text-wrap:balance;max-width:100%}
         </style><div class="wrap"><div class="cue"></div></div>`,
        { waitUntil: 'load' },
      );

      // Set as text, never as HTML: cue text comes from a script file and must not
      // be able to inject markup into the plate.
      await page.locator('.cue').evaluate((element, text) => {
        element.textContent = text;
      }, cue.text);

      await page.screenshot({ omitBackground: true, path });
      plates.push({
        endSeconds: cue.endSeconds,
        path,
        startSeconds: cue.startSeconds,
      });
    }
    /* eslint-enable no-await-in-loop */

    await page.close();
  } finally {
    await browser.close();
  }

  return plates;
};
