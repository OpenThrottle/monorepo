/**
 * @description Unit tests for generators resolver: list and get-by-name queries.
 */

import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test } from 'vitest';
import { GeneratorsResolver } from './generators.resolver';

describe('GeneratorsResolver', () => {
  let resolver: GeneratorsResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [GeneratorsResolver],
    }).compile();

    resolver = app.get<GeneratorsResolver>(GeneratorsResolver);
  });

  describe('generators', () => {
    test('returns known generators from @tools/generators', async () => {
      const result = await resolver.generators();

      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: expect.any(String),
            name: 'nestjs',
          }),
        ]),
      );
    });
  });

  describe('generator', () => {
    test('returns generator detail with schema for known name', async () => {
      const result = await resolver.generator({ name: 'nestjs' });

      expect(result).not.toBeNull();
      expect(result?.name).toBe('nestjs');
      expect(result?.description).toEqual(expect.any(String));
      expect(result?.schema).toEqual(expect.any(Object));
    });

    test('returns null for unknown generator name', async () => {
      const result = await resolver.generator({ name: 'does-not-exist' });

      expect(result).toBeNull();
    });
  });
});
