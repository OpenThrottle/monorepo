import { describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import {
  defaultTypedConfigForKind,
  fallthroughWeightsAreValid,
  parseRolloutTypedConfig,
  sumFallthroughWeights,
  toRolloutGraphqlTypedInput,
} from '../rollout-typed-config';

describe('rollout-typed-config', () => {
  describe('defaultTypedConfigForKind', () => {
    test('seeds LD-like boolean defaults with 100% on true', () => {
      const config = defaultTypedConfigForKind(RolloutFlagKind.Boolean);
      expect(config.variations.map((v) => v.valueJson)).toEqual([
        'false',
        'true',
      ]);
      expect(config.offVariation).toBe(0);
      expect(config.fallthrough.variations).toEqual([
        { variation: 1, weight: 100 },
      ]);
      expect(fallthroughWeightsAreValid(config.fallthrough.variations)).toBe(
        true,
      );
    });

    test('seeds equal splits for string kind', () => {
      const config = defaultTypedConfigForKind(RolloutFlagKind.String);
      expect(sumFallthroughWeights(config.fallthrough.variations)).toBe(100);
      expect(config.variations).toHaveLength(2);
    });
  });

  describe('parseRolloutTypedConfig', () => {
    const validForm = (): FormData => {
      const formData = new FormData();
      const config = defaultTypedConfigForKind(RolloutFlagKind.Boolean);
      formData.set('kind', config.kind);
      formData.set('offVariation', String(config.offVariation));
      formData.set('variationsJson', JSON.stringify(config.variations));
      formData.set('fallthroughJson', JSON.stringify(config.fallthrough));
      return formData;
    };

    test('accepts a valid boolean payload', () => {
      const result = parseRolloutTypedConfig(validForm());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(toRolloutGraphqlTypedInput(result.config).kind).toBe(
        RolloutFlagKind.Boolean,
      );
    });

    test('rejects fallthrough weights that do not sum to 100', () => {
      const formData = validForm();
      formData.set(
        'fallthroughJson',
        JSON.stringify({
          variations: [
            { variation: 0, weight: 40 },
            { variation: 1, weight: 40 },
          ],
        }),
      );
      const result = parseRolloutTypedConfig(formData);
      expect(result).toEqual({
        error: ROLLOUT_COPY.fallthroughSumError,
        ok: false,
      });
    });

    test('rejects fewer than two variations', () => {
      const formData = validForm();
      formData.set(
        'variationsJson',
        JSON.stringify([{ description: '', name: '', valueJson: 'true' }]),
      );
      const result = parseRolloutTypedConfig(formData);
      expect(result).toEqual({
        error: ROLLOUT_COPY.variationsMinError,
        ok: false,
      });
    });

    test('rejects invalid json variation values', () => {
      const formData = new FormData();
      formData.set('kind', 'json');
      formData.set('offVariation', '0');
      formData.set(
        'variationsJson',
        JSON.stringify([
          { description: '', name: '', valueJson: '{bad' },
          { description: '', name: '', valueJson: '{}' },
        ]),
      );
      formData.set(
        'fallthroughJson',
        JSON.stringify({
          variations: [
            { variation: 0, weight: 50 },
            { variation: 1, weight: 50 },
          ],
        }),
      );
      const result = parseRolloutTypedConfig(formData);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain(ROLLOUT_COPY.variationJsonInvalid);
    });
  });
});
