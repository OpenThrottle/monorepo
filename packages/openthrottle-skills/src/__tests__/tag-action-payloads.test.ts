/**
 * @description Unit tests for the inject-task action payload schema: the
 * placement enum (first/last/before/after), anchor requirement + exclusivity,
 * and default behavior.
 */

import { describe, expect, it } from 'vitest';
import {
  injectTaskActionPayloadSchema,
  parseTagActionPayload,
  TAG_ACTION_TYPES,
} from '../tag-action-payloads.ts';

describe('injectTaskActionPayloadSchema', () => {
  it('defaults placement to first when omitted', () => {
    const parsed = injectTaskActionPayloadSchema.parse({
      skillSlug: 'grilling',
    });
    expect(parsed.placement).toBe('first');
    expect(parsed.anchor).toBeUndefined();
  });

  it('accepts first/last without an anchor', () => {
    for (const placement of ['first', 'last'] as const) {
      expect(() =>
        injectTaskActionPayloadSchema.parse({
          placement,
          skillSlug: 'grilling',
        }),
      ).not.toThrow();
    }
  });

  it('rejects before/after without an anchor', () => {
    for (const placement of ['before', 'after'] as const) {
      expect(() =>
        injectTaskActionPayloadSchema.parse({
          placement,
          skillSlug: 'grilling',
        }),
      ).toThrow(/requires an anchor/);
    }
  });

  it('accepts before/after with a single-field anchor', () => {
    const parsed = injectTaskActionPayloadSchema.parse({
      anchor: { skillSlug: 'lint' },
      placement: 'after',
      skillSlug: 'grilling',
    });
    expect(parsed.placement).toBe('after');
    expect(parsed.anchor).toEqual({ skillSlug: 'lint' });
  });

  it('rejects an anchor with more than one field set', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        anchor: { skillSlug: 'lint', titleMatch: 'build' },
        placement: 'before',
        skillSlug: 'grilling',
      }),
    ).toThrow(/exactly one/);
  });

  it('rejects an anchor when placement is first/last', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        anchor: { skillSlug: 'lint' },
        placement: 'first',
        skillSlug: 'grilling',
      }),
    ).toThrow(/only valid with placement/);
  });

  it('rejects unknown keys (strict)', () => {
    expect(() =>
      injectTaskActionPayloadSchema.parse({
        bogus: true,
        skillSlug: 'grilling',
      }),
    ).toThrow();
  });

  it('is reachable through parseTagActionPayload by action type', () => {
    const parsed = parseTagActionPayload(TAG_ACTION_TYPES.INJECT_TASK, {
      anchor: { taskId: '00000000-0000-4000-8000-000000000001' },
      placement: 'before',
      skillSlug: 'grilling',
    });
    expect(parsed).toMatchObject({ placement: 'before' });
  });
});
