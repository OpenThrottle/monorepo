import { describe, expect, test } from 'vitest';
import { loader } from '../settings.appearance';
import type { Route } from '@/app/routes/+types/settings.appearance';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

describe('routes/settings.appearance.tsx', () => {
  test('loader returns diagnostics env and support bundle', async () => {
    const request = new Request('http://localhost/settings/appearance');
    const args: Route.LoaderArgs = {
      context: createTestRouterContext(),
      params: {},
      pattern: '/settings/appearance',
      request,
      url: new URL(request.url),
    };

    const data = await loader(args);

    expect(data.env.APP_NAME).toBeDefined();
    expect(data.env.APP_VERSION).toBeDefined();
    expect(data.supportBundle.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/,
    );
  });
});
