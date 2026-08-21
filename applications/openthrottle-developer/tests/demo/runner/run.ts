#!/usr/bin/env node

/**
 * @description Record one demo flow. Flow in, raw frames plus a step-timing
 * manifest out; the assembly stage turns those into a master.
 *
 *   pnpm exec tsx runner/run.ts --flow 03-first-plan
 *
 * Options:
 *   --flow <id>     flow to record (required); resolves ../flows/<id>.flow.ts
 *   --headed        run with a visible browser, for debugging a flow
 *   --base <url>    app under test (default http://localhost:6020)
 *   --portrait      record a SECOND pass at the portrait viewport, into
 *                   output/<slug>/portrait/. See "Portrait" below.
 *
 * Portrait: a 9:16 export derived from a 1920-wide capture is a compromise either
 * way — cropping clips a table at both edges, and fitting shrinks the text to
 * unreadable. Recording the same flow again at a 1080x1920 viewport lets the app's
 * own responsive layout do the work, which is what makes a Short legible. Prefer it
 * for any flow whose content is wider than a phone.
 *
 * The app must already be serving a PRODUCTION build against the DEMO database —
 * see ../README.md. Recording the dev server is not representative, and recording
 * the dev database is a leak.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

import { loadFormat, repositoryRoot } from './format';
import { createCapture } from './record';
import { runStep, signIn, stepTarget } from './actions';
import type { ActionContext } from './actions';
import type {
  DemoFlow,
  ManifestStep,
  RecordingManifest,
  RegionSample,
} from './types';

/**
 * Chrome kept out of frame. The editor deep-link buttons on /plans/create embed a
 * hard-coded absolute path, so they would put a real home directory on camera.
 * This is a recording workaround; the buttons themselves want fixing in the app.
 */
const HIDE_FOR_RECORDING = [
  '[data-testid="GlobalDevToolbar"]',
  'a[href^="cursor://"]',
  'a[href^="vscode://"]',
  'a[href^="claude://"]',
];

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

const main = async (): Promise<void> => {
  const flowId = argValue('flow');

  if (!flowId) {
    console.error('run: --flow <id> is required (e.g. --flow 03-first-plan)');
    process.exit(1);
  }

  const format = loadFormat();
  const baseUrl =
    argValue('base') ?? process.env.DEMO_BASE_URL ?? 'http://localhost:6020';
  const email = process.env.DEMO_USER_EMAIL ?? 'ada@atlasworks.example';
  const password = process.env.DEMO_USER_PASSWORD ?? 'DemoThrottle2026!';

  const flowModule: { readonly flow?: DemoFlow } = await import(
    `../flows/${flowId}.flow.ts`
  );
  const flow = flowModule.flow;

  if (!flow) {
    console.error(`run: ../flows/${flowId}.flow.ts does not export 'flow'`);
    process.exit(1);
  }

  const isPortrait = process.argv.includes('--portrait');
  const outputDir = isPortrait
    ? join(import.meta.dirname, '..', 'output', flowId, 'portrait')
    : join(import.meta.dirname, '..', 'output', flowId);
  mkdirSync(outputDir, { recursive: true });

  // Text dumps for the leak scan. Every beat's visible text is written out so
  // `scan/leak-scan.ts` can check what was ON SCREEN rather than what we intended to
  // put there. This is the automated half of the publish checklist: no OCR needed,
  // because the DOM already knows.
  const textDir = join(outputDir, 'text');
  mkdirSync(textDir, { recursive: true });

  // The portrait pass records at the Short's own dimensions, so the app lays out
  // for a narrow screen instead of being cropped or shrunk after the fact.
  const viewport = isPortrait
    ? { height: format.formats.short.height, width: format.formats.short.width }
    : format.recording.viewport;

  const browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
  });
  const context = await browser.newContext({
    // Dark, always: headless Chromium defaults to light and every overlay card is
    // designed on the brand near-black.
    colorScheme: format.recording.colorScheme,
    deviceScaleFactor: format.recording.deviceScaleFactor,
    reducedMotion: 'no-preference',
    viewport,
  });

  const page = await context.newPage();
  const actionContext: ActionContext = {
    baseUrl,
    hideSelectors: HIDE_FOR_RECORDING,
    page,
  };

  // Sign in BEFORE capture starts. A screencast must open on the payoff, not on a
  // login form, so the login is setup rather than content.
  await signIn(actionContext, { email, password });

  const session = await context.newCDPSession(page);
  const capture = await createCapture(session, outputDir, viewport);

  const steps: ManifestStep[] = [];
  const started = process.hrtime.bigint();
  const elapsed = (): number => Number(process.hrtime.bigint() - started) / 1e9;

  await capture.start();

  let beat = 'open';
  const regions: RegionSample[] = [];
  const sampledBeats = new Set<string>();

  const dumpedBeats = new Set<string>();

  /** Write the beat's visible text once, for the leak scan to read. */
  const dumpBeatText = async (label: string): Promise<void> => {
    if (dumpedBeats.has(label)) {
      return;
    }

    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    if (text.length === 0) {
      return;
    }

    dumpedBeats.add(label);
    writeFileSync(
      join(textDir, `${label.replaceAll(/[^a-z0-9-]/gi, '_')}.txt`),
      text,
      'utf8',
    );
  };

  /**
   * Sample where the beat's region of interest sits on screen, the first time we
   * see that beat. Measured after the step so the layout has settled.
   */
  const sampleRegion = async (label: string): Promise<void> => {
    const selector = flow.regionOfInterest?.[label];

    if (!selector || sampledBeats.has(label)) {
      return;
    }

    const box = await page
      .locator(selector)
      .first()
      .boundingBox()
      .catch(() => null);

    if (!box) {
      return;
    }

    sampledBeats.add(label);
    regions.push({
      atSeconds: elapsed(),
      beat: label,
      height: box.height,
      width: box.width,
      x: box.x,
      y: box.y,
    });
  };

  /* eslint-disable no-await-in-loop -- a flow is a sequence; steps must not overlap */
  for (const step of flow.steps) {
    beat = step.beat ?? beat;
    const tStart = elapsed();
    await runStep(actionContext, step);
    steps.push({
      beat,
      kind: step.kind,
      narrationCue: `${flow.id}:${beat}`,
      tEnd: elapsed(),
      tStart,
      ...(stepTarget(step) === undefined ? {} : { target: stepTarget(step) }),
    });
    await sampleRegion(beat);
    await dumpBeatText(beat);
  }
  /* eslint-enable no-await-in-loop */

  const wallSeconds = elapsed();
  await capture.stop();
  await context.close();
  await browser.close();

  const manifest: RecordingManifest = {
    flowId: flow.id,
    fps: format.formats.short.fps,
    frames: capture.frameCount(),
    height: viewport.height,
    portraitStrategy: flow.portraitStrategy ?? 'crop',
    regionOfInterest: flow.regionOfInterest ?? {},
    regions,
    steps,
    wallSeconds,
    width: viewport.width,
  };

  writeFileSync(
    join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `run: ${flow.id}${isPortrait ? ' (portrait)' : ''} — ${wallSeconds.toFixed(2)}s, ${String(steps.length)} steps, ${String(capture.frameCount())} frames`,
  );
  console.log(`run: ${outputDir.replace(repositoryRoot(), '.')}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
