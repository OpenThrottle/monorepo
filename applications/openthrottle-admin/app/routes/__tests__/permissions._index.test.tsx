import { describe, expect, test } from 'vitest';
import * as RouteModule from '../permissions._index';

describe('routes/permissions._index.tsx', () => {
  test('exports default component and meta', () => {
    expect(typeof RouteModule.default).toBe('function');
    expect(typeof RouteModule.meta).toBe('function');
  });

  test('exports loader', () => {
    expect(typeof RouteModule.loader).toBe('function');
  });
});
