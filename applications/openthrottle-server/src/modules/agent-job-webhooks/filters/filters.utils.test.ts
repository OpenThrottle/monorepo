import { describe, expect, it } from 'vitest';

import {
  evaluateWebhookFilters,
  validateWebhookFilters,
} from './filters.utils.ts';

const context = {
  headers: { 'x-github-event': 'pull_request' },
  payload: {
    action: 'opened',
    labels: [{ name: 'bug' }, { name: 'ui' }],
    nothing: null,
    number: 12,
    pull_request: { base: { ref: 'main' }, draft: false },
  },
};

const run = (filter: Parameters<typeof evaluateWebhookFilters>[0][number]) => {
  return evaluateWebhookFilters([filter], context);
};

describe('evaluateWebhookFilters', () => {
  it('matches an empty list', () => {
    expect(evaluateWebhookFilters([], context)).toStrictEqual({
      matched: true,
    });
  });

  describe('equals', () => {
    it('matches a string at a dot path', () => {
      expect(
        run({ op: 'equals', path: 'pull_request.base.ref', value: 'main' })
          .matched,
      ).toBe(true);
    });

    it('matches a number and a boolean by their string form', () => {
      expect(run({ op: 'equals', path: 'number', value: '12' }).matched).toBe(
        true,
      );
      expect(
        run({ op: 'equals', path: 'pull_request.draft', value: 'false' })
          .matched,
      ).toBe(true);
    });

    it('does not match a different value or a missing path', () => {
      expect(
        run({ op: 'equals', path: 'action', value: 'closed' }).matched,
      ).toBe(false);
      expect(run({ op: 'equals', path: 'missing', value: 'x' }).matched).toBe(
        false,
      );
    });

    it('reads an array element by index', () => {
      expect(
        run({ op: 'equals', path: 'labels.1.name', value: 'ui' }).matched,
      ).toBe(true);
    });

    it('reads an allow-listed header', () => {
      expect(
        run({
          op: 'equals',
          path: 'header:X-GitHub-Event',
          value: 'pull_request',
        }).matched,
      ).toBe(true);
    });
  });

  describe('not_equals', () => {
    it('matches a different value and a missing path', () => {
      expect(
        run({ op: 'not_equals', path: 'action', value: 'closed' }).matched,
      ).toBe(true);
      expect(
        run({ op: 'not_equals', path: 'missing', value: 'x' }).matched,
      ).toBe(true);
    });

    it('does not match an equal value', () => {
      expect(
        run({ op: 'not_equals', path: 'action', value: 'opened' }).matched,
      ).toBe(false);
    });
  });

  describe('in', () => {
    it('matches a listed value', () => {
      expect(
        run({ op: 'in', path: 'action', value: ['opened', 'reopened'] })
          .matched,
      ).toBe(true);
    });

    it('does not match an unlisted or missing value', () => {
      expect(run({ op: 'in', path: 'action', value: ['closed'] }).matched).toBe(
        false,
      );
      expect(run({ op: 'in', path: 'missing', value: ['x'] }).matched).toBe(
        false,
      );
    });
  });

  describe('exists / not_exists', () => {
    it('exists matches a present value and not a missing or null one', () => {
      expect(
        run({ op: 'exists', path: 'action', value: undefined }).matched,
      ).toBe(true);
      expect(
        run({ op: 'exists', path: 'missing', value: undefined }).matched,
      ).toBe(false);
      expect(
        run({ op: 'exists', path: 'nothing', value: undefined }).matched,
      ).toBe(false);
    });

    it('not_exists is the inverse', () => {
      expect(
        run({ op: 'not_exists', path: 'missing', value: undefined }).matched,
      ).toBe(true);
      expect(
        run({ op: 'not_exists', path: 'action', value: undefined }).matched,
      ).toBe(false);
    });
  });

  describe('prefix', () => {
    it('matches a string that starts with the value', () => {
      expect(run({ op: 'prefix', path: 'action', value: 'op' }).matched).toBe(
        true,
      );
    });

    it('does not match otherwise, or on an object', () => {
      expect(run({ op: 'prefix', path: 'action', value: 'cl' }).matched).toBe(
        false,
      );
      expect(
        run({ op: 'prefix', path: 'pull_request', value: 'x' }).matched,
      ).toBe(false);
    });
  });

  it('is AND: reports the index of the first filter that fails', () => {
    const result = evaluateWebhookFilters(
      [
        { op: 'equals', path: 'action', value: 'opened' },
        { op: 'equals', path: 'number', value: '99' },
        { op: 'exists', path: 'missing', value: undefined },
      ],
      context,
    );

    expect(result).toStrictEqual({ failedIndex: 1, matched: false });
  });

  it('never reads through the prototype chain', () => {
    expect(
      run({ op: 'exists', path: '__proto__.constructor', value: undefined })
        .matched,
    ).toBe(false);
    expect(
      run({ op: 'exists', path: 'constructor', value: undefined }).matched,
    ).toBe(false);
    expect(
      run({ op: 'exists', path: 'header:constructor', value: undefined })
        .matched,
    ).toBe(false);
  });
});

describe('validateWebhookFilters', () => {
  it('accepts a well-formed list', () => {
    const result = validateWebhookFilters([
      { op: 'equals', path: 'a', value: 'b', values: null },
      { op: 'in', path: 'c', value: null, values: ['x', 'y'] },
      { op: 'exists', path: 'd', value: null, values: null },
    ]);

    expect(result).toStrictEqual({
      filters: [
        { op: 'equals', path: 'a', value: 'b' },
        { op: 'in', path: 'c', value: ['x', 'y'] },
        { op: 'exists', path: 'd', value: undefined },
      ],
      ok: true,
    });
  });

  it('rejects more than 16 filters', () => {
    const drafts = Array.from({ length: 17 }, () => {
      return { op: 'exists', path: 'a', value: null, values: null };
    });

    expect(validateWebhookFilters(drafts).ok).toBe(false);
  });

  it('rejects a regex op', () => {
    const result = validateWebhookFilters([
      { op: 'regex', path: 'a', value: '.*', values: null },
    ]);

    expect(!result.ok && result.message).toContain('unknown op "regex"');
  });

  it('rejects an empty path', () => {
    expect(
      validateWebhookFilters([
        { op: 'exists', path: ' ', value: null, values: null },
      ]).ok,
    ).toBe(false);
  });

  it('rejects equals without a value', () => {
    expect(
      validateWebhookFilters([
        { op: 'equals', path: 'a', value: null, values: null },
      ]).ok,
    ).toBe(false);
  });

  it('rejects `in` with no values or more than 32', () => {
    expect(
      validateWebhookFilters([{ op: 'in', path: 'a', value: null, values: [] }])
        .ok,
    ).toBe(false);
    const many = Array.from({ length: 33 }, (_unused, index) => String(index));
    expect(
      validateWebhookFilters([
        { op: 'in', path: 'a', value: null, values: many },
      ]).ok,
    ).toBe(false);
  });
});
