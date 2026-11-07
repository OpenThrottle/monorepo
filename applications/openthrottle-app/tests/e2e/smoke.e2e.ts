import type { Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { E2E_SERVER_URL, E2E_USER } from './e2e-env.ts';
import type { LaunchedApp } from './launch-app.ts';
import { isServerReachable, launchApp } from './launch-app.ts';

const NAVIGATION_TIMEOUT_MS = 60_000;
const UUID_PATH = /\/plans\/[0-9a-f-]{36}\/?$/;

const reachable = await isServerReachable(E2E_SERVER_URL);

let suiteName = 'openthrottle-app smoke';

if (!reachable) {
  // Vitest swallows console output of a skipped suite, so the reason is also
  // baked into the suite name (shown by the verbose reporter). A silent skip
  // would look like a green run.
  suiteName = `SKIPPED, no OT server answered ${E2E_SERVER_URL}/health (start openthrottle-server:dev and seed developer@openthrottle.ai, or set OPENTHROTTLE_SERVER_URL)`;
  console.warn(`[openthrottle-app e2e] ${suiteName}`);
}

describe.skipIf(!reachable)(suiteName, () => {
  let launched: LaunchedApp | undefined;
  let page: Page | undefined;

  beforeAll(async () => {
    launched = await launchApp(E2E_SERVER_URL);
    page = await launched.app.firstWindow();
    await page.waitForURL(/\/(auth|dashboard)/, {
      timeout: NAVIGATION_TIMEOUT_MS,
    });
  });

  afterAll(async () => {
    await launched?.close();
  });

  it('signs in through the real form and renders the home route', async () => {
    if (!page) {
      throw new Error('The app window did not open.');
    }

    if (page.url().includes('/auth')) {
      await page.getByTestId('auth-email-input').fill(E2E_USER.email);
      await page.getByTestId('auth-password-input').fill(E2E_USER.password);
      await page.getByTestId('auth-submit-button').click();
    }

    await page.waitForURL(/\/dashboard/, { timeout: NAVIGATION_TIMEOUT_MS });
    await page
      .getByRole('main')
      .first()
      .waitFor({ state: 'visible', timeout: NAVIGATION_TIMEOUT_MS });

    expect(new URL(page.url()).pathname).toBe('/dashboard');
    expect(await page.getByTestId('auth-submit-button').count()).toBe(0);
  });

  it('opens a plan detail page from the plans list', async () => {
    if (!page) {
      throw new Error('The app window did not open.');
    }

    await page.goto(new URL('/plans', page.url()).toString());
    const firstPlanLink = page.getByTestId('plan-list-title-link').first();
    await firstPlanLink.waitFor({
      state: 'visible',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    const href = await firstPlanLink.getAttribute('href');
    expect(href).toMatch(UUID_PATH);

    await firstPlanLink.click();
    await page.waitForURL(UUID_PATH, { timeout: NAVIGATION_TIMEOUT_MS });
    await page
      .getByRole('heading')
      .first()
      .waitFor({ state: 'visible', timeout: NAVIGATION_TIMEOUT_MS });

    expect(new URL(page.url()).pathname).toBe(
      new URL(href ?? '', page.url()).pathname,
    );
  });
});
