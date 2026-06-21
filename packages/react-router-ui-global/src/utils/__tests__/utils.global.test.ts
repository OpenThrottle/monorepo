import { describe, expect, test } from 'vitest';
import {
  deriveOverallHealthStatus,
  healthStatusColorClass,
  healthValueColorClass,
} from '../utils.global';

describe('deriveOverallHealthStatus', () => {
  test('returns ok only when every component is ok', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      }),
    ).toBe('ok');
  });

  test('folds a dead websocket into the overall status (no false online)', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'unreachable',
      }),
    ).toBe('unreachable');
  });

  test('unreachable wins over unconfigured (worst-case)', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'unconfigured',
        redis: 'unreachable',
        websocket: 'ok',
      }),
    ).toBe('unreachable');
  });

  test('unconfigured when any component is unconfigured but none unreachable', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'unconfigured',
        redis: 'ok',
        websocket: 'ok',
      }),
    ).toBe('unconfigured');
  });

  test('treats missing payload as unconfigured (never claims online)', () => {
    expect(deriveOverallHealthStatus(undefined)).toBe('unconfigured');
  });

  test('treats unknown component values as unconfigured', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'definitely-not-a-status',
      }),
    ).toBe('unconfigured');
  });
});

describe('healthStatusColorClass', () => {
  test('maps each status to its dot color', () => {
    expect(healthStatusColorClass('ok')).toBe('bg-green-500');
    expect(healthStatusColorClass('unconfigured')).toBe('bg-amber-500');
    expect(healthStatusColorClass('unreachable')).toBe('bg-red-500');
  });
});

describe('healthValueColorClass', () => {
  test('shares the GlobalFooter mapping for per-component dots', () => {
    expect(healthValueColorClass('ok')).toBe('bg-green-500');
    expect(healthValueColorClass('unreachable')).toBe('bg-red-500');
    expect(healthValueColorClass('unconfigured')).toBe('bg-amber-500');
    expect(healthValueColorClass(undefined)).toBe('bg-amber-500');
  });
});
