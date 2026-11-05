import { describe, expect, test } from 'vitest';

import { PLAN_STATUS_DOT_COLOR } from '~/routing/plans/data/data.plan-status-dot-color';
import { PLAN_STATUS_FILTER_GROUPS } from '~/routing/plans/data/data.plan-status-filter-groups';
import { planStatusValues } from '~/routing/plans/types';

import {
  ALL_STATUSES_PARAM,
  DEFAULT_PLAN_STATUS,
  DEFAULT_STATUSES,
  isAllStatusSelection,
  isDefaultStatusSelection,
  isPlanStatusFilterValue,
  parseStatusesFromSearchParams,
  parseStatusFromSearchParams,
  PLAN_STATUS_FILTER_OPTIONS,
  STATUS_OPTIONS,
  statusesToSearchParamValues,
} from '../status-options';

describe('status-options constants', () => {
  test('every filter option carries a canonical value and a label', () => {
    expect(PLAN_STATUS_FILTER_OPTIONS.length).toBeGreaterThan(0);
    for (const option of PLAN_STATUS_FILTER_OPTIONS) {
      expect(isPlanStatusFilterValue(option.value)).toBe(true);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  test('offers PROMOTED as a filterable status', () => {
    expect(PLAN_STATUS_FILTER_OPTIONS).toContainEqual({
      label: 'Promoted',
      value: 'PROMOTED',
    });
  });
});

describe('isPlanStatusFilterValue', () => {
  test('accepts canonical statuses and rejects junk', () => {
    expect(isPlanStatusFilterValue('IN_PROGRESS')).toBe(true);
    expect(isPlanStatusFilterValue('in_progress')).toBe(false);
    expect(isPlanStatusFilterValue('NOPE')).toBe(false);
  });
});

describe('parseStatusFromSearchParams', () => {
  test('returns the upper-cased status when valid', () => {
    expect(
      parseStatusFromSearchParams(new URLSearchParams('status=in_progress')),
    ).toBe('IN_PROGRESS');
  });

  test('falls back to the default when missing or invalid', () => {
    expect(parseStatusFromSearchParams(new URLSearchParams())).toBe(
      DEFAULT_PLAN_STATUS,
    );
    expect(
      parseStatusFromSearchParams(new URLSearchParams('status=bogus')),
    ).toBe(DEFAULT_PLAN_STATUS);
  });
});

describe('parseStatusesFromSearchParams', () => {
  test('splits repeated and comma-separated statuses, dropping invalid', () => {
    expect(
      parseStatusesFromSearchParams(
        new URLSearchParams('status=pending,bogus&status=in_progress'),
      ),
    ).toEqual(['PENDING', 'IN_PROGRESS']);
  });

  test('defaults to DEFAULT_STATUSES when none are valid', () => {
    expect(
      parseStatusesFromSearchParams(new URLSearchParams('status=nope')),
    ).toEqual([...DEFAULT_STATUSES]);
  });

  test('defaults to DEFAULT_STATUSES when the param is absent', () => {
    expect(parseStatusesFromSearchParams(new URLSearchParams())).toEqual([
      ...DEFAULT_STATUSES,
    ]);
  });

  test('status=all yields every status, in any case or alongside others', () => {
    for (const query of ['status=all', 'status=ALL', 'status=PENDING,all']) {
      expect(parseStatusesFromSearchParams(new URLSearchParams(query))).toEqual(
        [...STATUS_OPTIONS],
      );
    }
  });
});

describe('statusesToSearchParamValues', () => {
  test('omits the param for the defaults, in any order', () => {
    expect(
      statusesToSearchParamValues([...DEFAULT_STATUSES].reverse()),
    ).toEqual([]);
  });

  test('writes the all sentinel for an empty or complete selection', () => {
    expect(statusesToSearchParamValues([])).toEqual([ALL_STATUSES_PARAM]);
    expect(statusesToSearchParamValues([...STATUS_OPTIONS])).toEqual([
      ALL_STATUSES_PARAM,
    ]);
  });

  test('writes any other selection verbatim', () => {
    expect(statusesToSearchParamValues(['BLOCKED', 'QUEUED'])).toEqual([
      'BLOCKED',
      'QUEUED',
    ]);
  });

  test('round-trips through parseStatusesFromSearchParams', () => {
    const selections = [
      [],
      [...DEFAULT_STATUSES],
      [...STATUS_OPTIONS],
      ['BLOCKED', 'QUEUED'],
    ];
    for (const selection of selections) {
      const params = new URLSearchParams();
      for (const v of statusesToSearchParamValues(selection)) {
        params.append('status', v);
      }
      const parsed = parseStatusesFromSearchParams(params);
      expect(new Set(parsed)).toEqual(
        new Set(selection.length === 0 ? STATUS_OPTIONS : selection),
      );
    }
  });
});

describe('selection predicates', () => {
  test('isAllStatusSelection: empty or every status', () => {
    expect(isAllStatusSelection([])).toBe(true);
    expect(isAllStatusSelection([...STATUS_OPTIONS].reverse())).toBe(true);
    expect(isAllStatusSelection(['PENDING'])).toBe(false);
  });

  test('isDefaultStatusSelection: exactly the defaults', () => {
    expect(isDefaultStatusSelection([...DEFAULT_STATUSES])).toBe(true);
    expect(isDefaultStatusSelection([...DEFAULT_STATUSES, 'BLOCKED'])).toBe(
      false,
    );
    expect(isDefaultStatusSelection([])).toBe(false);
  });
});

describe('PLAN_STATUS_FILTER_GROUPS', () => {
  test('lists every status exactly once', () => {
    const grouped = PLAN_STATUS_FILTER_GROUPS.flatMap((g) => g.statuses);
    expect(grouped).toHaveLength(Object.keys(planStatusValues).length);
    expect(new Set(grouped)).toEqual(new Set(Object.keys(planStatusValues)));
  });

  test('gives every status a distinct dot colour', () => {
    const colours = Object.values(PLAN_STATUS_DOT_COLOR);
    expect(new Set(colours).size).toBe(colours.length);
  });
});
