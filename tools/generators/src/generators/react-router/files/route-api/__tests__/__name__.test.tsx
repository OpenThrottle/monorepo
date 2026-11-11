import { describe, expect, test } from 'vitest';

import { action, loader } from '../<%= name %>';

describe('routes/<%= name %>.tsx', () => {
  describe('loader', () => {
    test('responds with an empty JSON payload', async () => {
      const response = await loader();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toStrictEqual({ data: [] });
    });
  });

  describe('action', () => {
    test('responds with an empty JSON payload', async () => {
      const response = await action();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toStrictEqual({ data: [] });
    });
  });
});
