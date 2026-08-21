/**
 * Spike path (B): Playwright screencast recorder.
 *
 * Records the reference demo — log in, create a plan, see it in the list — at a
 * fixed 1920x1080 with a synthetic cursor, eased pointer movement, human typing
 * cadence and explicit dwell. Emits the raw capture plus a step-timing manifest.
 *
 *   node recorder-b-playwright.mjs [--headed] [--cdp]
 *
 * --cdp swaps Playwright's built-in recordVideo for a CDP screencast captured to
 * PNG frames, to measure whether a fixed 60fps is reachable (recordVideo is not
 * frame-rate configurable).
 */
/* eslint-disable no-await-in-loop -- driving a browser IS sequential: each cursor
   step, keystroke and dwell must complete before the next one starts, and the
   whole point of the pacing is that they do not overlap. */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:7180';
const EMAIL = process.env.DEMO_USER_EMAIL ?? 'developer@openthrottle.ai';
const PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'FullThrottle2026!';
const USE_CDP = process.argv.includes('--cdp');
const OUT = join(
  import.meta.dirname,
  'output',
  USE_CDP ? 'b-cdp' : 'b-recordvideo',
);
const VIEWPORT = { height: 1080, width: 1920 };

rmSync(OUT, { force: true, recursive: true });
mkdirSync(join(OUT, 'frames'), { recursive: true });

const manifest = [];
const t0 = () => Number(process.hrtime.bigint() / 1_000_000n);
let start = 0;
const at = () => (t0() - start) / 1000;

/** Cubic ease-in-out: the difference between a screencast and a robot. */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const installCursor = async (page) => {
  await page.addStyleTag({
    content: `#__demo_cursor{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;
      transform:translate(-100px,-100px);will-change:transform;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}
      #__demo_cursor.click #__demo_ring{opacity:1;transform:scale(1)}
      #__demo_ring{position:absolute;left:-12px;top:-12px;width:52px;height:52px;border:3px solid #FF0000;border-radius:50%;
      opacity:0;transform:scale(.2);transition:opacity .28s ease-out,transform .28s ease-out}`,
  });
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = '__demo_cursor';
    el.innerHTML =
      '<div id="__demo_ring"></div>' +
      '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2l18 11-8 1.5L10 24z" fill="#F7F9FA" stroke="#0A0D0F" stroke-width="1.6"/></svg>';
    document.body.appendChild(el);
    window.__demoCursor = { x: -100, y: -100 };
  });
};

const moveCursor = async (page, x, y, durationMs = 520) => {
  const steps = Math.max(2, Math.round(durationMs / 16));
  const from = await page.evaluate(() => window.__demoCursor);
  for (let i = 1; i <= steps; i += 1) {
    const p = ease(i / steps);
    const nx = from.x + (x - from.x) * p;
    const ny = from.y + (y - from.y) * p;
    await page.evaluate(
      ([cx, cy]) => {
        window.__demoCursor = { x: cx, y: cy };
        const el = document.getElementById('__demo_cursor');
        if (el) el.style.transform = `translate(${cx}px,${cy}px)`;
      },
      [nx, ny],
    );
    await page.mouse.move(nx, ny);
    await page.waitForTimeout(16);
  }
};

const clickTarget = async (page, selector, label) => {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no bounding box for ${selector}`);
  await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.evaluate(() =>
    document.getElementById('__demo_cursor')?.classList.add('click'),
  );
  await page.waitForTimeout(140);
  await page.locator(selector).first().click();
  await page.evaluate(() =>
    document.getElementById('__demo_cursor')?.classList.remove('click'),
  );
  manifest.push({ at: at(), label, selector, step: 'click' });
};

/** ~50 wpm with jitter. Instant fill reads as fake; this reads as a person. */
const typeHuman = async (page, selector, text, label) => {
  const box = await page.locator(selector).boundingBox();
  if (box) {
    await moveCursor(
      page,
      box.x + Math.min(box.width / 2, 240),
      box.y + box.height / 2,
      380,
    );
  }
  await page.locator(selector).click();
  for (const char of text) {
    await page.keyboard.type(char);
    await page.waitForTimeout(48 + ((char.charCodeAt(0) * 7) % 55));
  }
  manifest.push({ at: at(), label, selector, step: 'type', text });
};

const dwell = async (page, ms, label) => {
  await page.waitForTimeout(ms);
  manifest.push({ at: at(), label, ms, step: 'dwell' });
};

const browser = await chromium.launch({
  headless: !process.argv.includes('--headed'),
});
const context = await browser.newContext({
  deviceScaleFactor: 1,
  ...(USE_CDP ? {} : { recordVideo: { dir: OUT, size: VIEWPORT } }),
  viewport: VIEWPORT,
});
const page = await context.newPage();

let frames = 0;
let session;
// CDP emits a frame only when the page changes, so a constant-rate assembly needs
// each frame's wall-clock timestamp. Without it, idle stretches play back fast and
// busy stretches play back slow.
const frameTimes = [];
if (USE_CDP) {
  session = await context.newCDPSession(page);
  session.on('Page.screencastFrame', async (frame) => {
    frames += 1;
    frameTimes.push({
      file: `f${String(frames).padStart(6, '0')}.png`,
      timestamp: frame.metadata.timestamp,
    });
    writeFileSync(
      join(OUT, 'frames', `f${String(frames).padStart(6, '0')}.png`),
      Buffer.from(frame.data, 'base64'),
    );
    await session
      .send('Page.screencastFrameAck', { sessionId: frame.sessionId })
      .catch(() => {});
  });
}

start = t0();

// --- Beat 1: land on /auth, hydrated. Hydration matters: clicking submit before
// React mounts silently does nothing (the form handler is not attached yet).
await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => Boolean(document.getElementById('ot-env')),
  null,
  { timeout: 20000 },
);
await page.waitForTimeout(2500);
await installCursor(page);
if (USE_CDP) {
  await session.send('Page.startScreencast', {
    everyNthFrame: 1,
    format: 'png',
    maxHeight: 1080,
    maxWidth: 1920,
  });
}
manifest.push({ at: at(), label: 'auth-ready', step: 'navigate' });
await dwell(page, 700, 'hook');

// --- Beat 2: sign in.
await typeHuman(page, '#auth-email', EMAIL, 'type-email');
await typeHuman(page, '#auth-password', PASSWORD, 'type-password');
await clickTarget(page, '#auth-submit-button', 'submit-login');
await page.waitForURL('**/dashboard', { timeout: 30000 });
await page.waitForTimeout(1200);
await installCursor(page);
manifest.push({ at: at(), label: 'dashboard', step: 'navigate' });
await dwell(page, 900, 'dashboard-hold');

// --- Beat 3: create a plan.
await page.goto(`${BASE}/plans/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await installCursor(page);
await typeHuman(
  page,
  '#plan-title',
  'Add rate limiting to the public API',
  'type-plan-title',
);
await typeHuman(
  page,
  '#plan-summary',
  'Protect the public endpoints from bursts.',
  'type-plan-summary',
);
await dwell(page, 500, 'pre-submit');
await clickTarget(page, '#plan-submit-button', 'submit-plan');
await page.waitForTimeout(3000);
manifest.push({
  at: at(),
  label: 'plan-created',
  step: 'navigate',
  url: page.url(),
});

// --- Beat 4: the plan in the list.
await page.goto(`${BASE}/plans`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="PlansTable"]', { timeout: 20000 });
await page.waitForTimeout(800);
await installCursor(page);
await moveCursor(page, 700, 460, 700);
await dwell(page, 1400, 'payoff-hold');

if (USE_CDP) {
  await session.send('Page.stopScreencast');
}
const wall = at();
await context.close();
await browser.close();

if (USE_CDP && frameTimes.length > 1) {
  // ffmpeg concat demuxer: each frame holds for the gap to the next one, so the
  // result is real time and a held frame is a long duration, not a dropped one.
  const lines = [];
  for (let i = 0; i < frameTimes.length; i += 1) {
    const next = frameTimes[i + 1]?.timestamp ?? frameTimes[i].timestamp + 0.04;
    lines.push(`file 'frames/${frameTimes[i].file}'`);
    lines.push(`duration ${(next - frameTimes[i].timestamp).toFixed(4)}`);
  }
  lines.push(`file 'frames/${frameTimes[frameTimes.length - 1].file}'`);
  writeFileSync(join(OUT, 'frames.concat'), `${lines.join('\n')}\n`);
}

writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify(
    {
      frames,
      mode: USE_CDP ? 'cdp-screencast' : 'recordVideo',
      steps: manifest,
      wallSeconds: wall,
    },
    null,
    2,
  ),
);
console.log(
  `recorder-b (${USE_CDP ? 'cdp' : 'recordVideo'}): ${wall.toFixed(2)}s, ${manifest.length} steps, ${frames} frames -> ${OUT}`,
);
