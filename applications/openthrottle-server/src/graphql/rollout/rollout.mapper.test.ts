/**
 * @description Unit tests for rollout GraphQL mappers: domain ↔ GraphQL shapes
 * and valueJson parse/serialize.
 */

import { BadRequestException } from '@nestjs/common';
import {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
} from '@openthrottle/nestjs-rollout';
import type { RolloutFlag } from '@openthrottle/nestjs-rollout';
import { describe, expect, test } from 'vitest';
import {
  toDomainCreateInput,
  toDomainUpdatePatch,
  toFeatureFlagObject,
  toRolloutFlagObject,
} from './rollout.mapper';

const flag: RolloutFlag = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  description: 'desc',
  enabled: true,
  fallthrough: ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  id: 'flag-1',
  key: 'new-dashboard',
  kind: ROLLOUT_FLAG_KIND.BOOLEAN,
  offVariation: 0,
  targetRoles: ['admin'],
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
};

describe('rollout.mapper', () => {
  describe('toRolloutFlagObject', () => {
    test('serializes variation values as valueJson', () => {
      const result = toRolloutFlagObject(flag);
      expect(result.kind).toBe(ROLLOUT_FLAG_KIND.BOOLEAN);
      expect(result.offVariation).toBe(0);
      expect(result.variations).toEqual([
        { description: null, name: null, valueJson: 'false' },
        { description: null, name: null, valueJson: 'true' },
      ]);
      expect(result.fallthrough).toEqual({
        variations: [{ variation: 1, weight: 100 }],
      });
    });
  });

  describe('toFeatureFlagObject', () => {
    test('boolean fallthrough true → enabled true + valueJson', () => {
      expect(
        toFeatureFlagObject({
          key: 'new-dashboard',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: true,
          variationIndex: 1,
        }),
      ).toEqual({
        enabled: true,
        key: 'new-dashboard',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
        valueJson: 'true',
        variationIndex: 1,
      });
    });

    test('string flag with fallthrough → enabled true', () => {
      expect(
        toFeatureFlagObject({
          key: 'theme',
          kind: ROLLOUT_FLAG_KIND.STRING,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: 'dark',
          variationIndex: 0,
        }),
      ).toMatchObject({
        enabled: true,
        kind: ROLLOUT_FLAG_KIND.STRING,
        valueJson: '"dark"',
      });
    });

    test('string flag off → enabled false', () => {
      expect(
        toFeatureFlagObject({
          key: 'theme',
          kind: ROLLOUT_FLAG_KIND.STRING,
          reason: ROLLOUT_EVALUATION_REASON.OFF,
          value: 'light',
          variationIndex: 1,
        }).enabled,
      ).toBe(false);
    });
  });

  describe('toDomainCreateInput', () => {
    test('parses valueJson into typed variations', () => {
      const result = toDomainCreateInput({
        description: null,
        enabled: true,
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        offVariation: 0,
        targetRoles: [],
        variations: [
          { description: null, name: 'control', valueJson: '"light"' },
          { description: null, name: 'treatment', valueJson: '"dark"' },
        ],
      });
      expect(result).toEqual({
        description: null,
        enabled: true,
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        offVariation: 0,
        targetRoles: [],
        variations: [
          { name: 'control', value: 'light' },
          { name: 'treatment', value: 'dark' },
        ],
      });
    });

    test('rejects invalid valueJson', () => {
      expect(() =>
        toDomainCreateInput({
          description: null,
          enabled: false,
          fallthrough: null,
          key: 'bad',
          kind: ROLLOUT_FLAG_KIND.JSON,
          offVariation: null,
          targetRoles: [],
          variations: [
            { description: null, name: null, valueJson: '{not-json' },
            { description: null, name: null, valueJson: '{}' },
          ],
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('toDomainUpdatePatch', () => {
    test('forwards only provided fields', () => {
      expect(
        toDomainUpdatePatch({
          description: null,
          enabled: null,
          fallthrough: null,
          id: 'flag-1',
          key: null,
          kind: null,
          offVariation: null,
          targetRoles: ['viewer'],
          variations: null,
        }),
      ).toEqual({
        description: null,
        targetRoles: ['viewer'],
      });
    });
  });
});
