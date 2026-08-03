import { describe, expect, it, vi } from 'vitest';

import { defineRolloutFlags } from '../../catalog';
import { mergeRolloutEvaluations } from '../merge-rollout-evaluations';

const catalog = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
  'theme.mode': { defaultValue: 'system', kind: 'string' },
});

describe('mergeRolloutEvaluations', () => {
  describe('when evaluations match the catalog', () => {
    it('overlays parsed server values', () => {
      const onWarn = vi.fn();
      const values = mergeRolloutEvaluations(
        catalog,
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
          {
            enabled: true,
            key: 'theme.mode',
            kind: 'string',
            valueJson: '"dark"',
          },
        ],
        { onWarn },
      );

      expect(values).toEqual({
        'billing.invoices': true,
        'theme.mode': 'dark',
      });
      expect(onWarn).not.toHaveBeenCalled();
    });
  });

  describe('when a catalog key is missing from the server', () => {
    it('keeps the default and warns', () => {
      const onWarn = vi.fn();
      const values = mergeRolloutEvaluations(
        catalog,
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
        ],
        { onWarn },
      );

      expect(values['billing.invoices']).toBe(true);
      expect(values['theme.mode']).toBe('system');
      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining('theme.mode'),
      );
    });
  });

  describe('when the server kind mismatches the catalog', () => {
    it('prefers the catalog default and warns', () => {
      const onWarn = vi.fn();
      const values = mergeRolloutEvaluations(
        catalog,
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'string',
            valueJson: '"true"',
          },
          {
            enabled: true,
            key: 'theme.mode',
            kind: 'string',
            valueJson: '"dark"',
          },
        ],
        { onWarn },
      );

      expect(values['billing.invoices']).toBe(false);
      expect(values['theme.mode']).toBe('dark');
      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining('kind mismatch'),
      );
    });
  });

  describe('when the server returns an unknown key', () => {
    it('ignores it unless strict is enabled', () => {
      const onWarn = vi.fn();
      mergeRolloutEvaluations(
        catalog,
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
          {
            enabled: true,
            key: 'theme.mode',
            kind: 'string',
            valueJson: '"dark"',
          },
          {
            enabled: true,
            key: 'unknown.flag',
            kind: 'boolean',
            valueJson: 'true',
          },
        ],
        { onWarn },
      );
      expect(onWarn).not.toHaveBeenCalledWith(
        expect.stringContaining('unknown.flag'),
      );

      mergeRolloutEvaluations(
        catalog,
        [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
          {
            enabled: true,
            key: 'theme.mode',
            kind: 'string',
            valueJson: '"dark"',
          },
          {
            enabled: true,
            key: 'unknown.flag',
            kind: 'boolean',
            valueJson: 'true',
          },
        ],
        { onWarn, strict: true },
      );
      expect(onWarn).toHaveBeenCalledWith(
        expect.stringContaining('unknown.flag'),
      );
    });
  });
});
