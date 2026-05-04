import { describe, expect, test } from 'vitest';
import { loader } from '../settings._index';
import type { Route } from '@/app/routes/+types/settings._index';

describe('routes/settings._index.tsx', () => {
  test('loader returns diagnostics env, support bundle, and URL matrix keys', async () => {
    const args = {
      context: undefined,
      params: {},
      request: new Request('http://localhost/settings'),
    } as Route.LoaderArgs;

    const data = await loader(args);

    expect(data.env.APP_NAME).toBeDefined();
    expect(data.env.APP_VERSION).toBeDefined();
    expect(data.env.APP_URL_DEVELOPER).toBeDefined();
    expect(data.env.API_URL_INTERNAL).toBeDefined();
    expect(data.supportBundle.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
    );
  });
});
