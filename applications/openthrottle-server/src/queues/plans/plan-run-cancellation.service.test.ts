import { describe, expect, test, beforeEach, vi } from 'vitest';
import { PlanRunCancellationService } from './plan-run-cancellation.service';

describe('PlanRunCancellationService', () => {
  let service: PlanRunCancellationService;

  beforeEach(() => {
    service = new PlanRunCancellationService();
  });

  test('attach returns a signal that is aborted when abort is called', () => {
    const signal = service.attach('plan-1');
    const listener = vi.fn();
    signal.addEventListener('abort', listener);

    expect(service.abort('plan-1')).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(listener).toHaveBeenCalled();
  });

  test('abort returns false when no controller is registered', () => {
    expect(service.abort('unknown')).toBe(false);
  });

  test('detach clears registration so abort is a no-op', () => {
    service.attach('plan-1');
    service.detach('plan-1');
    expect(service.abort('plan-1')).toBe(false);
  });

  test('attach for same planId replaces prior controller and aborts the old signal', () => {
    const first = service.attach('plan-1');
    const firstListener = vi.fn();
    first.addEventListener('abort', firstListener);

    const second = service.attach('plan-1');

    expect(first.aborted).toBe(true);
    expect(firstListener).toHaveBeenCalled();
    expect(second.aborted).toBe(false);
    expect(service.abort('plan-1')).toBe(true);
    expect(second.aborted).toBe(true);
  });
});
