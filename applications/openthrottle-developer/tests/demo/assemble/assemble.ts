#!/usr/bin/env node

/**
 * @description Turn a recording plus its narration into upload-ready masters.
 *
 *   pnpm exec tsx assemble/assemble.ts --script 03-first-plan [--music bed.mp3]
 *
 * Inputs (produced by earlier stages):
 *   output/<slug>/frames.concat + manifest.json            (runner)
 *   output/<slug>/portrait/… (optional)                    (runner --portrait)
 *   output/<slug>/audio/*.wav + timings.json               (narrate)
 *   docs/marketing/format.json + assets/*.svg              (the spec)
 *
 * Outputs:
 *   output/<slug>/<slug>-16x9.mp4
 *   output/<slug>/<slug>-9x16.mp4   (captions burned in)
 *   output/<slug>/<slug>.srt
 *   output/<slug>/metadata.json
 *
 * The 9:16 master prefers a PORTRAIT CAPTURE when one exists, because reframing a
 * 1920-wide capture is a compromise either way: cropping clips a table at both
 * edges, and fitting shrinks the text past readable. Recording the flow again at the
 * Short's own viewport lets the app's responsive layout do the work — verified side
 * by side, it is not a marginal difference.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { buildMaster } from './master';
import { loadFormat, repositoryRoot } from '../runner/format';
import { renderCaptionPlates, renderCards } from './cards';
import type { NarrationTimings } from '../narrate/types';
import type { Overlay } from './master';
import type { RecordingManifest } from '../runner/types';

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

const readJson = <T>(
  path: string,
  guard: (value: unknown) => value is T,
  what: string,
): T => {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

  if (!guard(parsed)) {
    throw new Error(`${path}: not a valid ${what}`);
  }

  return parsed;
};

const isManifest = (value: unknown): value is RecordingManifest =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray(Reflect.get(value, 'steps')) &&
  Array.isArray(Reflect.get(value, 'regions'));

const isTimings = (value: unknown): value is NarrationTimings =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray(Reflect.get(value, 'segments'));

const main = async (): Promise<void> => {
  const slug = argValue('script');

  if (!slug) {
    console.error('assemble: --script <slug> is required');
    process.exit(1);
  }

  const format = loadFormat();
  const outputDir = join(import.meta.dirname, '..', 'output', slug);
  const workDir = join(outputDir, 'work');
  const audioDir = join(outputDir, 'audio');

  for (const required of [
    'frames.concat',
    'manifest.json',
    join('audio', 'timings.json'),
  ]) {
    if (!existsSync(join(outputDir, required))) {
      console.error(
        `assemble: missing ${required} — run the runner and narrate stages first`,
      );
      process.exit(1);
    }
  }

  rmSync(workDir, { force: true, recursive: true });
  mkdirSync(workDir, { recursive: true });

  const manifest = readJson(
    join(outputDir, 'manifest.json'),
    isManifest,
    'recording manifest',
  );
  const timings = readJson(
    join(audioDir, 'timings.json'),
    isTimings,
    'narration timings',
  );

  const portraitDir = join(outputDir, 'portrait');
  const hasPortraitCapture =
    existsSync(join(portraitDir, 'frames.concat')) &&
    existsSync(join(portraitDir, 'manifest.json'));
  const portraitManifest = hasPortraitCapture
    ? readJson(
        join(portraitDir, 'manifest.json'),
        isManifest,
        'portrait manifest',
      )
    : manifest;

  // --- Title text comes from the script's front matter, so the card cannot drift
  // from the video it labels.
  const scriptSource = readFileSync(
    join(repositoryRoot(), 'docs', 'marketing', 'scripts', `${slug}.md`),
    'utf8',
  );
  const title = (scriptSource.match(/^title:\s*(.*)$/m)?.[1] ?? slug)
    .trim()
    .replace(/^['"]|['"]$/g, '');

  const cardLines = (scriptSource.match(/^titleCard:\s*\[(.*)\]$/m)?.[1] ?? '')
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter((part) => part.length > 0);

  const landscape = format.formats.short;
  const portrait = format.formats.short;
  const outroLandscape = join(workDir, 'outro-landscape.png');
  const outroPortrait = join(workDir, 'outro-portrait.png');
  const lowerThird = join(workDir, 'lower-third.png');

  await renderCards([
    {
      height: 1080,
      outputPath: outroLandscape,
      substitutions: {},
      svg: 'outro-card.svg',
      transparent: false,
      width: 1920,
    },
    {
      height: portrait.height,
      outputPath: outroPortrait,
      substitutions: {},
      svg: 'outro-card.svg',
      transparent: false,
      width: portrait.width,
    },
    {
      height: portrait.height,
      outputPath: lowerThird,
      substitutions: {
        TITLE_LINE_1: cardLines[0] ?? title,
        TITLE_LINE_2: cardLines[1] ?? '',
      },
      svg: 'lower-third.svg',
      transparent: true,
      width: portrait.width,
    },
  ]);

  const musicPath = argValue('music');

  // --- 16:9 master. No captions burned in: the landscape feed plays with sound,
  // and YouTube renders the .srt sidecar for anyone who wants them.
  const landscapeResult = await buildMaster({
    audioDir,
    captureDir: outputDir,
    format,
    manifest,
    musicPath,
    outputPath: join(outputDir, `${slug}-16x9.mp4`),
    outroPngPath: outroLandscape,
    overlays: [],
    reframe: 'none',
    srtPath: join(outputDir, `${slug}.srt`),
    timings,
    variant: { ...landscape, height: 1080, width: 1920 },
    workDir,
  });

  // --- 9:16 master. Captions burned in, because Shorts autoplay silently and that
  // is how most of the audience receives the narration at all.
  const portraitPlanSource = hasPortraitCapture ? portraitDir : outputDir;
  const portraitCues = hasPortraitCapture ? [] : landscapeResult.cues;

  // Cue times differ per capture, so the plates are rendered from the timeline the
  // portrait master will actually use. Build it once to learn the cues, then again
  // with the plates: cheap, and it keeps the caption timing honest.
  const probe = await buildMaster({
    audioDir,
    captureDir: portraitPlanSource,
    format,
    manifest: portraitManifest,
    musicPath,
    outputPath: join(workDir, 'probe-9x16.mp4'),
    outroPngPath: outroPortrait,
    overlays: [],
    reframe: hasPortraitCapture ? 'none' : portraitManifest.portraitStrategy,
    timings,
    variant: portrait,
    workDir,
  });

  const cues = portraitCues.length > 0 ? portraitCues : probe.cues;
  const plates = await renderCaptionPlates(cues, {
    background: format.brand.background,
    bottomSafeFraction: format.safeAreas.portrait.bottom,
    font: format.brand.sans,
    foreground: format.brand.foreground,
    height: portrait.height,
    outputDir: workDir,
    width: portrait.width,
  });

  const overlays: readonly Overlay[] = [
    {
      endSeconds:
        format.cards.lowerThird.startSeconds +
        format.cards.lowerThird.durationSeconds,
      path: lowerThird,
      startSeconds: format.cards.lowerThird.startSeconds,
    },
    ...plates,
  ];

  const portraitResult = await buildMaster({
    audioDir,
    captureDir: portraitPlanSource,
    format,
    manifest: portraitManifest,
    musicPath,
    outputPath: join(outputDir, `${slug}-9x16.mp4`),
    outroPngPath: outroPortrait,
    overlays,
    reframe: hasPortraitCapture ? 'none' : portraitManifest.portraitStrategy,
    timings,
    variant: portrait,
    workDir,
  });

  // --- Upload metadata.
  const tags = [...scriptSource.matchAll(/^ {2}- (.+)$/gm)].map(
    (match) => match[1]?.trim() ?? '',
  );
  const description = [
    `${title}.`,
    '',
    'OpenThrottle is an open-source planning and execution substrate for coding',
    'agents: plans and tasks as first-class data, agent runs you can watch, and every',
    'commit traced back to the task that caused it.',
    '',
    'Repo:    https://github.com/OpenThrottle/monorepo',
    'Docs:    https://github.com/OpenThrottle/monorepo/tree/main/docs',
    'License: Apache-2.0',
  ].join('\n');

  writeFileSync(
    join(outputDir, 'metadata.json'),
    `${JSON.stringify(
      {
        captions: `${slug}.srt`,
        cues: portraitResult.cues.length,
        description,
        heldSeconds: Number(portraitResult.heldSeconds.toFixed(2)),
        landscape: `${slug}-16x9.mp4`,
        musicBed: musicPath ?? null,
        narrationBackend: timings.backend,
        narrationVoice: timings.voice,
        portrait: `${slug}-9x16.mp4`,
        portraitSource: hasPortraitCapture
          ? 'portrait-capture'
          : `landscape-${portraitManifest.portraitStrategy}`,
        slug,
        tags: tags.slice(0, 10),
        title,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    `assemble: ${slug} — held ${portraitResult.heldSeconds.toFixed(2)}s, ${String(portraitResult.cues.length)} cues, portrait from ${hasPortraitCapture ? 'a portrait capture' : `the landscape capture (${portraitManifest.portraitStrategy})`}`,
  );
  console.log(
    `assemble: ${join(outputDir, `${slug}-16x9.mp4`).replace(repositoryRoot(), '.')}`,
  );
  console.log(
    `assemble: ${join(outputDir, `${slug}-9x16.mp4`).replace(repositoryRoot(), '.')}`,
  );
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
