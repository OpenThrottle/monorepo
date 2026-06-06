import { describe, expect, test } from 'vitest';
import { action, loader } from '../<%= name %>';

describe('routes/<%= name %>.tsx', () => {
  test('loader returns empty object', async () => {
    await expect(loader({} as never)).resolves.toStrictEqual({});
  });

  test('action returns empty object', async () => {
    await expect(action({} as never)).resolves.toStrictEqual({});
  });
});
