import { describe, expect, test } from 'vitest';

import { loader } from '../<%= name %>';

describe('routes/<%= name %>.tsx', () => {
  test('responds with an empty JSON payload', async () => {
    const response = await loader();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toStrictEqual({ data: [] });
  });
});
