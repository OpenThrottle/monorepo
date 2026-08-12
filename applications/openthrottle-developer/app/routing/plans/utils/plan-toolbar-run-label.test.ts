import { describe, expect, test } from 'vitest';
import { getPlanToolbarRunButtonLabel } from './plan-toolbar-run-label';

describe('getPlanToolbarRunButtonLabel', () => {
  test('returns "Completed" for COMPLETED', () => {
    expect(getPlanToolbarRunButtonLabel('COMPLETED')).toBe('Completed');
  });

  test('returns "In progress" for IN_PROGRESS', () => {
    expect(getPlanToolbarRunButtonLabel('IN_PROGRESS')).toBe('In progress');
  });

  test('returns "Add to Queue" for PENDING', () => {
    expect(getPlanToolbarRunButtonLabel('PENDING')).toBe('Add to Queue');
  });

  test('returns "Queued" for QUEUED', () => {
    expect(getPlanToolbarRunButtonLabel('QUEUED')).toBe('Queued');
  });

  test('returns "Skipped" for SKIPPED', () => {
    expect(getPlanToolbarRunButtonLabel('SKIPPED')).toBe('Skipped');
  });

  test('returns "Run plan" for an unrecognized status', () => {
    expect(getPlanToolbarRunButtonLabel('SOMETHING_ELSE')).toBe('Run plan');
  });

  test('returns "Run plan" when status is undefined', () => {
    expect(getPlanToolbarRunButtonLabel(undefined)).toBe('Run plan');
  });
});
