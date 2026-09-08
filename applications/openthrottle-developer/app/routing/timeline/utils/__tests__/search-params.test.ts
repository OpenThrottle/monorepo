/**
 * @description Unit tests for reading and writing timeline view state through
 * URL search params. The read and write halves are tested together because the
 * contract that matters is the round trip — a view you can paste at someone.
 */

import { describe, expect, it } from 'vitest';
import {
  TimelineLaneGrouping,
  TimelineSpanKind,
} from '~/__generated__/graphql';
import {
  parseTimelineBranch,
  parseTimelineGrouping,
  parseTimelineKinds,
  parseTimelineWindowPreset,
  resolveTimelineWindow,
} from '../parsers';
import {
  toggleTimelineKind,
  withTimelineBranch,
  withTimelineGrouping,
  withTimelineKinds,
  withTimelineWindow,
} from '../search-params';
import { TIMELINE_MARKER_KINDS, TIMELINE_SPAN_KINDS } from '../../config/kinds';
import { TIMELINE_SEARCH_PARAM } from '../../config/defaults';

const params = (search: string): URLSearchParams => new URLSearchParams(search);

describe('parseTimelineWindowPreset', () => {
  it('reads a valid preset', () => {
    expect(parseTimelineWindowPreset(params('window=30d'))).toBe('30d');
  });

  it('falls back to the default for an absent param', () => {
    expect(parseTimelineWindowPreset(params(''))).toBe('7d');
  });

  it('falls back rather than throwing on a hand-edited URL', () => {
    expect(parseTimelineWindowPreset(params('window=nonsense'))).toBe('7d');
  });
});

describe('resolveTimelineWindow', () => {
  const now = new Date('2026-09-08T00:00:00Z');

  it('builds a 24-hour window for the 24h preset', () => {
    const window = resolveTimelineWindow(params('window=24h'), now);

    expect(window.toIso).toBe(now.toISOString());
    expect(window.fromIso).toBe('2026-09-07T00:00:00.000Z');
  });

  it('builds a 7-day window by default', () => {
    const window = resolveTimelineWindow(params(''), now);

    expect(window.fromIso).toBe('2026-09-01T00:00:00.000Z');
  });

  it('builds a 30-day window for the 30d preset', () => {
    const window = resolveTimelineWindow(params('window=30d'), now);

    expect(window.fromIso).toBe('2026-08-09T00:00:00.000Z');
  });
});

describe('parseTimelineGrouping', () => {
  it('reads a valid grouping', () => {
    expect(parseTimelineGrouping(params('grouping=BY_BACKEND'))).toBe(
      TimelineLaneGrouping.ByBackend,
    );
  });

  it('defaults to grouping by plan', () => {
    expect(parseTimelineGrouping(params(''))).toBe(TimelineLaneGrouping.ByPlan);
  });

  it('ignores an unknown grouping', () => {
    expect(parseTimelineGrouping(params('grouping=BY_VIBES'))).toBe(
      TimelineLaneGrouping.ByPlan,
    );
  });
});

describe('parseTimelineKinds', () => {
  it('returns null for an absent param, meaning every kind', () => {
    expect(parseTimelineKinds(params(''), 'spans', TIMELINE_SPAN_KINDS)).toBe(
      null,
    );
  });

  it('returns an empty list for an empty param, meaning no kinds', () => {
    // Distinct from absent: unchecking every box has to survive a reload.
    expect(
      parseTimelineKinds(params('spans='), 'spans', TIMELINE_SPAN_KINDS),
    ).toEqual([]);
  });

  it('reads a comma-separated list', () => {
    expect(
      parseTimelineKinds(
        params('spans=PLAN_RUN,WORK_SESSION'),
        'spans',
        TIMELINE_SPAN_KINDS,
      ),
    ).toEqual(['PLAN_RUN', 'WORK_SESSION']);
  });

  it('drops values that are not real kinds', () => {
    expect(
      parseTimelineKinds(
        params('spans=PLAN_RUN,MADE_UP'),
        'spans',
        TIMELINE_SPAN_KINDS,
      ),
    ).toEqual(['PLAN_RUN']);
  });
});

describe('parseTimelineBranch', () => {
  it('reads a branch', () => {
    expect(parseTimelineBranch(params('branch=main'))).toBe('main');
  });

  it('treats an empty branch as absent', () => {
    expect(parseTimelineBranch(params('branch='))).toBeNull();
  });
});

describe('writers', () => {
  it('omits the window param at its default so the canonical URL is clean', () => {
    expect(withTimelineWindow(params(''), '7d').toString()).toBe('');
  });

  it('writes a non-default window', () => {
    expect(withTimelineWindow(params(''), '30d').get('window')).toBe('30d');
  });

  it('omits the grouping at its default', () => {
    expect(
      withTimelineGrouping(params(''), TimelineLaneGrouping.ByPlan).toString(),
    ).toBe('');
  });

  it('clears the branch param rather than writing an empty value', () => {
    expect(withTimelineBranch(params('branch=main'), null).has('branch')).toBe(
      false,
    );
  });

  it('omits the kinds param when every kind is selected', () => {
    expect(
      withTimelineKinds(
        params(''),
        TIMELINE_SEARCH_PARAM.spanKinds,
        [...TIMELINE_SPAN_KINDS],
        TIMELINE_SPAN_KINDS,
      ).toString(),
    ).toBe('');
  });

  it('writes an empty value when no kinds are selected', () => {
    expect(
      withTimelineKinds(
        params(''),
        TIMELINE_SEARCH_PARAM.spanKinds,
        [],
        TIMELINE_SPAN_KINDS,
      ).get(TIMELINE_SEARCH_PARAM.spanKinds),
    ).toBe('');
  });

  it('round-trips a partial kind selection through the URL', () => {
    const written = withTimelineKinds(
      params(''),
      TIMELINE_SEARCH_PARAM.spanKinds,
      ['PLAN_RUN'],
      TIMELINE_SPAN_KINDS,
    );

    expect(
      parseTimelineKinds(
        written,
        TIMELINE_SEARCH_PARAM.spanKinds,
        TIMELINE_SPAN_KINDS,
      ),
    ).toEqual(['PLAN_RUN']);
  });

  it('round-trips "no kinds at all" rather than reverting to everything', () => {
    const written = withTimelineKinds(
      params(''),
      TIMELINE_SEARCH_PARAM.markerKinds,
      [],
      TIMELINE_MARKER_KINDS,
    );

    expect(
      parseTimelineKinds(
        written,
        TIMELINE_SEARCH_PARAM.markerKinds,
        TIMELINE_MARKER_KINDS,
      ),
    ).toEqual([]);
  });

  it('preserves unrelated params when writing', () => {
    expect(withTimelineWindow(params('other=keep'), '30d').get('other')).toBe(
      'keep',
    );
  });
});

describe('toggleTimelineKind', () => {
  it('removes a kind from an implicit "everything" selection', () => {
    const next = toggleTimelineKind<TimelineSpanKind>(
      null,
      TIMELINE_SPAN_KINDS,
      TimelineSpanKind.PlanRun,
    );

    expect(next).not.toContain('PLAN_RUN');
    expect(next).toHaveLength(TIMELINE_SPAN_KINDS.length - 1);
  });

  it('adds a kind back', () => {
    const next = toggleTimelineKind<TimelineSpanKind>(
      [TimelineSpanKind.WorkSession],
      TIMELINE_SPAN_KINDS,
      TimelineSpanKind.PlanRun,
    );

    expect(next).toContain('PLAN_RUN');
  });

  it('keeps the canonical order so the URL is stable however boxes were clicked', () => {
    const next = toggleTimelineKind<TimelineSpanKind>(
      [TimelineSpanKind.WorkSession],
      TIMELINE_SPAN_KINDS,
      TimelineSpanKind.PlanRun,
    );

    expect(next).toEqual(['PLAN_RUN', 'WORK_SESSION']);
  });
});
