/**
 * @description The flow verbs, executed against a Playwright page.
 *
 * Two rules hold everywhere in this file:
 *
 * 1. **Wait on app state, never on the clock** (except `dwell`, which is pacing).
 *    A slow machine should stretch the recording, not desynchronise it.
 * 2. **Cursor first, then act.** Every interaction moves the pointer to the
 *    target and lets it arrive before clicking or typing, because that is what
 *    makes the recording legible.
 */

import type { Page } from 'playwright';

import { installCursor, moveCursorTo, setClickRing } from './cursor';
import type { DemoStep } from './types';

/** ~50 wpm with per-character jitter. Instant fill reads as fake. */
const TYPING_BASE_MS = 48;
const TYPING_JITTER_MS = 55;

/** How long the cursor takes to cross to a new target. */
const CURSOR_TRAVEL_MS = 520;

export interface ActionContext {
  readonly baseUrl: string;
  readonly hideSelectors: readonly string[];
  readonly page: Page;
}

/**
 * Where to point the cursor.
 *
 * Retried, because a tab or panel mid-transition can report no box for a frame or two
 * even though it is on its way to being visible. Failing the whole take on that is
 * wrong; failing after several attempts is right, because then the selector really is
 * bad — and a bad selector should stop the recording rather than produce a video of
 * the wrong thing.
 */
const centreOf = async (
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> => {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 20_000 });

  /* eslint-disable no-await-in-loop -- a retry loop; attempts must not overlap */
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    const box = await locator.boundingBox();

    if (box && box.width > 0 && box.height > 0) {
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }

    await page.waitForTimeout(300);
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `no bounding box for '${selector}' after 4 attempts — is the selector right?`,
  );
};

/**
 * Wait for hydration, not merely for an element to exist. Clicking a React form's
 * submit button before mount does nothing at all: no error, no navigation, no
 * request. The env script is written by the document, so its presence plus a
 * settled network is the cheapest reliable signal the app is interactive.
 */
const waitForHydration = async (page: Page): Promise<void> => {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(
    () => Boolean(document.getElementById('ot-env')),
    null,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1_200);
};

export const runStep = async (
  context: ActionContext,
  step: DemoStep,
): Promise<void> => {
  const { baseUrl, hideSelectors, page } = context;

  switch (step.kind) {
    case 'click': {
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, CURSOR_TRAVEL_MS);
      await setClickRing(page, true);
      await page.waitForTimeout(140);
      await page.locator(step.selector).first().click();
      await setClickRing(page, false);
      return;
    }

    case 'dwell': {
      // The one intentional pause: pacing for the narration, not a wait for the app.
      await page.waitForTimeout(step.ms);
      return;
    }

    case 'highlight': {
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, CURSOR_TRAVEL_MS);
      await page
        .locator(step.selector)
        .first()
        .evaluate((element) => {
          element.classList.add('__demo_highlight');
        });
      await page.waitForTimeout(step.ms ?? 900);
      await page
        .locator(step.selector)
        .first()
        .evaluate((element) => {
          element.classList.remove('__demo_highlight');
        });
      return;
    }

    case 'hover': {
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, CURSOR_TRAVEL_MS);
      await page.locator(step.selector).first().hover();
      return;
    }

    case 'moveTo': {
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, CURSOR_TRAVEL_MS);
      return;
    }

    case 'navigate': {
      await page.goto(`${baseUrl}${step.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForHydration(page);
      // A full-document navigation discards the overlay, so re-inject it.
      await installCursor(page, hideSelectors);
      return;
    }

    case 'press': {
      await page.keyboard.press(step.key);
      return;
    }

    case 'scrollTo': {
      await page.locator(step.selector).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      return;
    }

    case 'select': {
      // The category control is a button-triggered listbox, not a native select,
      // so open it, then click the option by its accessible name. Falls back to
      // selectOption for any control that really is a <select>.
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, CURSOR_TRAVEL_MS);
      await setClickRing(page, true);
      await page.waitForTimeout(140);

      try {
        await page.selectOption(step.selector, step.value, { timeout: 2_000 });
      } catch {
        await page.locator(step.selector).first().click();
        await page
          .getByRole('option', { exact: true, name: step.value })
          .click({ timeout: 10_000 });
      }

      await setClickRing(page, false);
      return;
    }

    case 'type': {
      const { x, y } = await centreOf(page, step.selector);
      await moveCursorTo(page, x, y, 380);
      await page.locator(step.selector).first().click();

      /* eslint-disable no-await-in-loop -- typing is sequential by definition */
      for (const character of step.text) {
        await page.keyboard.type(character);
        // Jitter derived from the character, not from a random source: the runner
        // must produce the same recording twice.
        await page.waitForTimeout(
          TYPING_BASE_MS + ((character.charCodeAt(0) * 7) % TYPING_JITTER_MS),
        );
      }
      /* eslint-enable no-await-in-loop */
      return;
    }

    case 'waitFor': {
      await page
        .locator(step.selector)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      return;
    }

    case 'waitForUrl': {
      await page.waitForURL(step.pattern, { timeout: 30_000 });
      await waitForHydration(page);
      await installCursor(page, hideSelectors);
      return;
    }

    case 'zoomTo': {
      // Scale the target's nearest positioned ancestor rather than the page, so
      // surrounding layout does not reflow mid-shot.
      const scale = step.scale ?? 1.35;
      await page
        .locator(step.selector)
        .first()
        .evaluate((element: HTMLElement, factor: number) => {
          element.style.transition = 'transform .6s ease-in-out';
          element.style.transformOrigin = 'center';
          element.style.transform = `scale(${String(factor)})`;
        }, scale);
      await page.waitForTimeout(700);
      return;
    }

    default: {
      throw new Error(`unhandled step: ${JSON.stringify(step)}`);
    }
  }
};

export const signIn = async (
  context: ActionContext,
  credentials: { readonly email: string; readonly password: string },
): Promise<void> => {
  const { baseUrl, hideSelectors, page } = context;

  await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded' });
  await waitForHydration(page);

  // The production build does not prefill the form — defaultEmail/defaultPassword
  // are development-only — so the runner types the credentials.
  await page.locator('#auth-email').fill(credentials.email);
  await page.locator('#auth-password').fill(credentials.password);
  await page.locator('#auth-submit-button').click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
  await waitForHydration(page);
  await installCursor(page, hideSelectors);
};

export const stepTarget = (step: DemoStep): string | undefined => {
  if ('selector' in step) {
    return step.selector;
  }

  if ('path' in step) {
    return step.path;
  }

  if ('pattern' in step) {
    return step.pattern;
  }

  return undefined;
};
