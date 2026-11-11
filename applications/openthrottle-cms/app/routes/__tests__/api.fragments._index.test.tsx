import { describe, expect, test } from 'vitest';

import { loader } from '../api.fragments._index';

describe('routes/api.fragments._index.tsx', () => {
  test('responds with an empty JSON payload', async () => {
    const response = await loader();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ data: [] });
  });
});
