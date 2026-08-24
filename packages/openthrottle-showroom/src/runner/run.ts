#!/usr/bin/env node

/**
 * @description Record one demo flow. Flow in, raw frames plus a step-timing
 * manifest out; the assembly stage turns those into a master.
 *
 *   pnpm exec tsx runner/run.ts --flow 03-first-plan
 *
 * Options:
 *   --flow <id>     flow to record (required); resolves ../episodes/<id>/flow.ts
 *   --headed        run with a visible browser, for debugging a flow
 *   --base <url>    app under test (default http://localhost:6020)
 *   --portrait      record a SECOND pass at the portrait viewport, into
 *                   output/<slug>/portrait/. See "Portrait" below.
 *
 * Portrait: a 9:16 export derived from a 1920-wide capture is a compromise either
 * way — cropping clips a table at both edges, and fitting shrinks the text to
 * unreadable. Recording the same flow again lets the app's own responsive layout do
 * the work, which is what makes a Short legible. Prefer it for any flow whose
 * content is wider than a phone.
 *
 * The portrait pass lays out at a MOBILE viewport (`recording.portraitViewport`,
 * 540x960) and captures 1080x1920: with deviceScaleFactor 2 the page renders at
 * exactly the frame size, so nothing is upscaled, but the app is below its 768px
 * mobile breakpoint and picks its phone layout. Recording at the Short's own 1080
 * CSS pixels put us ABOVE that breakpoint — the app rendered its desktop layout,
 * sidebar and all, and roughly 60% of the frame was empty background.
 *
 * The app must already be serving a PRODUCTION build against the DEMO database —
 * see ../README.md. Recording the dev server is not representative, and recording
 * the dev database is a leak.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

import { loadFormat, outputRoot, repositoryRoot } from './format';
import { toRegionSample } from './regions';
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
 *
 * The server-metrics strip is here for a different reason: it is real, wanted UI
 * (so the leak scan rightly passes it), but it is developer diagnostics on a
 * marketing video, and its RSS / heap / CPU numbers differ on every take — which
 * makes two recordings of the same flow gratuitously non-identical. Hidden at the
 * recording layer rather than gated in the component, because the panel belongs in
 * the app.
 */
const HIDE_FOR_RECORDING = [
  '[data-testid="GlobalDevToolbar"]',
  '[data-testid="GlobalMetrics"]',
  'a[href^="cursor://"]',
  'a[href^="vscode://"]',
  'a[href^="claude://"]',
];

/**
 * Budget for one region-of-interest measurement. A region either exists at the
 * moment we look or it does not — there is nothing to wait for, because the step
 * that would create it has already run.
 *
 * Playwright's default is 30s, and `boundingBox()` inherits it. A selector that
 * never matches therefore burned 30s per attempt and the `.catch()` swallowed it,
 * so the run still reported success: one wrong selector turned a 54-second
 * recording into 264 seconds with no error and no warning.
 */
const REGION_SAMPLE_TIMEOUT_MS = 750;

/**
 * How many times to look for a beat's region before giving up on it. More than one
 * because a region can legitimately be missing on the first step of a beat and
 * present a step later; bounded, because an unmatched selector must cost a fixed
 * amount of time rather than one timeout per remaining step.
 */
const REGION_SAMPLE_ATTEMPTS = 3;

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
    `../episodes/${flowId}/flow.ts`
  );
  const flow = flowModule.flow;

  if (!flow) {
    console.error(`run: ../episodes/${flowId}/flow.ts does not export 'flow'`);
    process.exit(1);
  }

  const isPortrait = process.argv.includes('--portrait');
  const outputDir = isPortrait
    ? join(outputRoot(), flowId, 'portrait')
    : join(outputRoot(), flowId);
  mkdirSync(outputDir, { recursive: true });

  // Text dumps for the leak scan. Every beat's visible text is written out so
  // `scan/leak-scan.ts` can check what was ON SCREEN rather than what we intended to
  // put there. This is the automated half of the publish checklist: no OCR needed,
  // because the DOM already knows.
  // Cleared per take, the way `record.ts` clears `frames/`. Beat labels change as a
  // flow is edited, so a dump from an earlier take outlives the beat it belonged to
  // and the leak scan reads it as part of this recording — a gate that reports on
  // footage nobody shot is worse than no gate.
  const textDir = join(outputDir, 'text');
  rmSync(textDir, { force: true, recursive: true });
  mkdirSync(textDir, { recursive: true });

  // Two sizes, deliberately distinct for the portrait pass: `viewport` is the CSS
  // layout the app sees, `captureSize` is the frame the screencast emits. They are
  // equal for landscape; for portrait the app lays out narrow (mobile) while the
  // frame stays at the Short's full 1080x1920.
  const viewport = isPortrait
    ? format.recording.portraitViewport
    : format.recording.viewport;
  const captureSize = isPortrait
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
    surfaces: flow.surfaces ?? {},
  };

  // Sign in BEFORE capture starts. A screencast must open on the payoff, not on a
  // login form, so the login is setup rather than content.
  await signIn(actionContext, { email, password });

  const session = await context.newCDPSession(page);
  const capture = await createCapture(session, outputDir, captureSize);

  const steps: ManifestStep[] = [];
  const started = process.hrtime.bigint();
  const elapsed = (): number => Number(process.hrtime.bigint() - started) / 1e9;

  await capture.start();

  let beat = 'open';
  const regions: RegionSample[] = [];
  const sampledBeats = new Set<string>();

  /** Attempts spent per beat, so a bad selector cannot be retried forever. */
  const regionAttempts = new Map<string, number>();

  const dumpedBeats = new Set<string>();

  /**
   * Write a beat's visible text for the leak scan to read.
   *
   * Called TWICE per beat: once on the beat's first step (`<beat>`) and once as the
   * beat hands over (`<beat>-end`). One dump is not enough, because a beat's most
   * revealing frame is usually its last — the text that was typed, the block that
   * was revealed, the row that finished loading. `leak-scan.ts` globs `*.txt`, so
   * both dumps are scanned, and a beat whose content never changed just writes the
   * same text twice. A missed frame costs a disclosure; a duplicate costs a file.
   */
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
   * see that beat. Measured after the step so the layout has settled, converted to
   * frame pixels, and bounded: at most `REGION_SAMPLE_ATTEMPTS` looks of
   * `REGION_SAMPLE_TIMEOUT_MS` each, so a selector that never matches costs a beat
   * ~2s rather than 30s for every remaining step of the flow.
   */
  const sampleRegion = async (label: string): Promise<void> => {
    const selector = flow.regionOfInterest?.[label];

    if (!selector || sampledBeats.has(label)) {
      return;
    }

    const attempts = regionAttempts.get(label) ?? 0;

    if (attempts >= REGION_SAMPLE_ATTEMPTS) {
      return;
    }

    regionAttempts.set(label, attempts + 1);

    const box = await page
      .locator(selector)
      .first()
      .boundingBox({ timeout: REGION_SAMPLE_TIMEOUT_MS })
      .catch(() => null);

    if (!box) {
      return;
    }

    sampledBeats.add(label);
    regions.push(
      toRegionSample(
        box,
        { atSeconds: elapsed(), beat: label },
        viewport,
        captureSize,
      ),
    );
  };

  /* eslint-disable no-await-in-loop -- a flow is a sequence; steps must not overlap */
  for (const step of flow.steps) {
    // Dump the OUTGOING beat before the incoming step runs: the page is still in the
    // previous beat's final state at this point, and one step later it is not.
    if (step.beat !== undefined && step.beat !== beat) {
      await dumpBeatText(`${beat}-end`);
    }

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

  // Stamped the instant the flow ends, before any teardown, and handed to the
  // capture so the final frame is held for the flow's closing dwell and not also for
  // however long the frame writer takes to drain.
  const endedAt = Date.now() / 1_000;
  const wallSeconds = elapsed();
  await capture.stop(endedAt);
  await dumpBeatText(`${beat}-end`);

  // A declared region that never resolved is a broken flow, not a detail: the
  // assembler falls back to a centred crop, so the Short silently frames the wrong
  // thing. Name the beat and the selector rather than letting the run look clean.
  const unresolved = Object.entries(flow.regionOfInterest ?? {}).filter(
    ([label]) => !sampledBeats.has(label),
  );

  for (const [label, selector] of unresolved) {
    console.warn(
      `run: WARNING regionOfInterest['${label}'] never resolved after ${String(REGION_SAMPLE_ATTEMPTS)} attempt(s) — selector: ${selector}`,
    );
  }

  if (unresolved.length > 0) {
    console.warn(
      `run: WARNING ${String(unresolved.length)} of ${String(Object.keys(flow.regionOfInterest ?? {}).length)} declared region(s) unresolved; the portrait crop will fall back to centre framing for those beats`,
    );
  }

  await context.close();
  await browser.close();

  const manifest: RecordingManifest = {
    flowId: flow.id,
    fps: format.formats.short.fps,
    frames: capture.frameCount(),
    // Frame dimensions, not the CSS viewport: the assembler crops frames, and
    // `regions` above are already converted to this space.
    height: captureSize.height,
    portraitStrategy: flow.portraitStrategy ?? 'crop',
    regionOfInterest: flow.regionOfInterest ?? {},
    regions,
    steps,
    wallSeconds,
    width: captureSize.width,
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
