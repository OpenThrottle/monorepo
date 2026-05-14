import { describe, expect, test } from 'vitest';
import { loader } from '../settings.appearance';
import type { Route } from '@/app/routes/+types/settings.appearance';

describe('routes/settings.appearance.tsx', () => {
  test('loader returns diagnostics env and support bundle', async () => {
    const args = {
      context: undefined,
      params: {},
      request: new Request('http://localhost/settings/appearance'),
    } as Route.LoaderArgs;

    const data = await loader(args);

    expect(data.env.APP_NAME).toBeDefined();
    expect(data.env.APP_VERSION).toBeDefined();
    expect(data.supportBundle.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
    );
  });
});
