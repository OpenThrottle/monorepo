import { describe, expect, test } from 'vitest';
import { links, loader, meta, shouldRevalidate } from '../root';
import { SITE_TITLE } from '~/global/config/settings';

describe('app/root.tsx exports', () => {
  test('returns stylesheet link metadata', () => {
    const result = links();

    expect(result).toHaveLength(1);

    // @ts-expect-error - we're testing the function
    expect(result[0]?.rel).toBe('stylesheet');

    // @ts-expect-error - we're testing the function
    expect(typeof result[0]?.href).toBe('string');
  });

  test('never revalidates at root level', () => {
    // @ts-expect-error - we're testing the function
    expect(shouldRevalidate({})).toBe(false);
  });

  test('returns canonical request URL and env values from loader', async () => {
    const request = new Request('https://cms.openthrottle.ai/some-route');

    const result = await loader({
      context: {},
      params: {},
      request,
      unstable_pattern: '',
    });

    expect(result.canonical).toBe('https://cms.openthrottle.ai/some-route');
    expect(result.env).toMatchObject({
      APP_ENV: process.env.APP_ENV,
      APP_NAME: process.env.APP_NAME,
      APP_URL: process.env.APP_URL,
      APP_VERSION: process.env.APP_VERSION,
      NODE_ENV: process.env.NODE_ENV,
      ROLLBAR_TOKEN: process.env.ROLLBAR_TOKEN,
    });
  });

  test('returns expected meta tags', () => {
    // @ts-expect-error - we're testing the function
    const result = meta({});

    expect(result[0]).toEqual({ title: `Welcome | ${SITE_TITLE}` });
    expect(result[1]).toHaveProperty('name', 'description');
  });
});
