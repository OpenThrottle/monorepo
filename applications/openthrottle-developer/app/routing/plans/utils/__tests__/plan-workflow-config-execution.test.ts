import { describe, expect, test } from 'vitest';

import {
  isSelectablePlanRunDriver,
  PLAN_RUN_SELECTABLE_DRIVERS,
} from '../plan-workflow-config-execution';

describe('PLAN_RUN_SELECTABLE_DRIVERS', () => {
  test('lists cursor then claude in display order', () => {
    expect(PLAN_RUN_SELECTABLE_DRIVERS).toEqual(['cursor', 'claude']);
  });
});

describe('isSelectablePlanRunDriver', () => {
  test.each(PLAN_RUN_SELECTABLE_DRIVERS)(
    'accepts known driver %s',
    (driver) => {
      expect(isSelectablePlanRunDriver(driver)).toBe(true);
    },
  );

  test('rejects an unknown driver', () => {
    expect(isSelectablePlanRunDriver('codex')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isSelectablePlanRunDriver('')).toBe(false);
  });
});
