/**
 * @description The synthetic cursor. Headless Chromium draws no pointer, and a
 * screencast where things click themselves reads as a robot — this is the single
 * biggest quality difference between a capture and a screencast.
 *
 * Movement is driven from Node in ~16ms steps rather than from a page-side
 * requestAnimationFrame loop: rAF does not run reliably in a page the browser
 * considers hidden, and a cursor that teleports is worse than no cursor.
 */

import type { Page } from 'playwright';

const CURSOR_ID = '__demo_cursor';

/** Cubic ease-in-out. Linear movement is the tell. */
const ease = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

declare global {
  var __demoCursor: { x: number; y: number } | undefined;
}

/**
 * Install (or re-install) the cursor. Must run after every full-document
 * navigation, because the overlay lives in the document it was injected into.
 */
export const installCursor = async (
  page: Page,
  hideSelectors: readonly string[],
): Promise<void> => {
  const hidden =
    hideSelectors.length > 0
      ? `${hideSelectors.join(',')}{display:none !important}`
      : '';

  await page.addStyleTag({
    content: `
      #${CURSOR_ID}{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;
        transform:translate(-100px,-100px);will-change:transform;filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))}
      #${CURSOR_ID}.click #__demo_ring{opacity:1;transform:scale(1)}
      #__demo_ring{position:absolute;left:-12px;top:-12px;width:52px;height:52px;border:3px solid #FF0000;
        border-radius:50%;opacity:0;transform:scale(.2);transition:opacity .28s ease-out,transform .28s ease-out}
      .__demo_highlight{outline:3px solid #FF0000 !important;outline-offset:3px;border-radius:6px;
        transition:outline-color .2s ease-out}
      ${hidden}
    `,
  });

  await page.evaluate((cursorId) => {
    if (document.getElementById(cursorId)) {
      return;
    }

    const element = document.createElement('div');
    element.id = cursorId;
    element.innerHTML =
      '<div id="__demo_ring"></div>' +
      '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2l18 11-8 1.5L10 24z" fill="#F7F9FA" stroke="#0A0D0F" stroke-width="1.6"/></svg>';
    document.body.appendChild(element);
    globalThis.__demoCursor = { x: -100, y: -100 };
  }, CURSOR_ID);
};

export const moveCursorTo = async (
  page: Page,
  x: number,
  y: number,
  durationMs = 520,
): Promise<void> => {
  const steps = Math.max(2, Math.round(durationMs / 16));
  const from = (await page.evaluate(() => globalThis.__demoCursor)) ?? {
    x: -100,
    y: -100,
  };

  /* eslint-disable no-await-in-loop -- the movement IS sequential; overlapping steps would jitter */
  for (let step = 1; step <= steps; step += 1) {
    const progress = ease(step / steps);
    const x1 = from.x + (x - from.x) * progress;
    const y1 = from.y + (y - from.y) * progress;

    await page.evaluate(
      ([cursorId, cx, cy]) => {
        globalThis.__demoCursor = { x: Number(cx), y: Number(cy) };
        const element = document.getElementById(String(cursorId));

        if (element) {
          element.style.transform = `translate(${String(cx)}px,${String(cy)}px)`;
        }
      },
      [CURSOR_ID, x1, y1] as const,
    );
    await page.mouse.move(x1, y1);
    await page.waitForTimeout(16);
  }
  /* eslint-enable no-await-in-loop */
};

export const setClickRing = async (page: Page, on: boolean): Promise<void> => {
  await page.evaluate(
    ([cursorId, enabled]) => {
      document
        .getElementById(String(cursorId))
        ?.classList.toggle('click', Boolean(enabled));
    },
    [CURSOR_ID, on] as const,
  );
};
