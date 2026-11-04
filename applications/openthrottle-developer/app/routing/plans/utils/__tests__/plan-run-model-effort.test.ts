import { describe, expect, test } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';

import {
  filterPlanRunnableModels,
  parsePlanRunEffort,
  parsePlanRunModelOptionId,
  reconcilePlanRunEffort,
  toPlanRunModelOptionId,
} from '../plan-run-model-effort';

describe('plan-run-model-effort', () => {
  describe('filterPlanRunnableModels', () => {
    test('keeps claude and cursor CLI options and drops local endpoints', () => {
      expect(
        filterPlanRunnableModels(MOCK_PLAN_RUN_MODELS).map(
          (option) => option.id,
        ),
      ).toEqual(['cursor|auto', 'cursor|gpt-5.2', 'claude|opus']);
    });

    test('drops driver x endpoint joins and non-plan backends', () => {
      expect(
        filterPlanRunnableModels([
          { id: 'claude|http://host:1/v1::m', label: 'm' },
          { id: 'codex|gpt-5', label: 'gpt-5' },
        ]),
      ).toEqual([]);
    });
  });

  describe('toPlanRunModelOptionId', () => {
    test('matches a named model on its backend', () => {
      expect(
        toPlanRunModelOptionId('cursor', 'gpt-5.2', MOCK_PLAN_RUN_MODELS),
      ).toBe('cursor|gpt-5.2');
    });

    test('does not match a model on the wrong backend', () => {
      expect(
        toPlanRunModelOptionId('claude', 'gpt-5.2', MOCK_PLAN_RUN_MODELS),
      ).toBeUndefined();
    });

    test('falls back to the bare-backend option for the default model', () => {
      expect(
        toPlanRunModelOptionId('claude', 'auto', [
          { id: 'claude', label: 'Claude Code' },
        ]),
      ).toBe('claude');
    });

    test('has no match for a named model absent from the list', () => {
      expect(
        toPlanRunModelOptionId('claude', 'sonnet', [
          { id: 'claude', label: 'Claude Code' },
        ]),
      ).toBeUndefined();
    });
  });

  describe('parsePlanRunModelOptionId', () => {
    test('splits a CLI option into backend and model', () => {
      expect(parsePlanRunModelOptionId('claude|opus')).toEqual({
        backend: 'claude',
        model: 'opus',
      });
    });

    test('resolves a bare backend to the default model', () => {
      expect(parsePlanRunModelOptionId('cursor')).toEqual({
        backend: 'cursor',
        model: 'auto',
      });
    });

    test('rejects ids a plan cannot run', () => {
      expect(parsePlanRunModelOptionId('')).toBeNull();
      expect(parsePlanRunModelOptionId('codex|gpt-5')).toBeNull();
      expect(parsePlanRunModelOptionId('http://h:1/v1::llama')).toBeNull();
    });
  });

  describe('parsePlanRunEffort', () => {
    test('narrows a known level and rejects the rest', () => {
      expect(parsePlanRunEffort('extraHigh')).toBe('extraHigh');
      expect(parsePlanRunEffort('')).toBeUndefined();
      expect(parsePlanRunEffort('turbo')).toBeUndefined();
    });
  });

  describe('reconcilePlanRunEffort', () => {
    test('keeps an effort the backend advertises', () => {
      expect(reconcilePlanRunEffort('claude', 'max')).toBe('max');
    });

    test('drops an effort the backend does not advertise', () => {
      expect(reconcilePlanRunEffort('claude', 'ultra')).toBe('');
    });

    test('drops any effort on a backend with no reasoning knob', () => {
      expect(reconcilePlanRunEffort('cursor', 'high')).toBe('');
    });
  });
});
