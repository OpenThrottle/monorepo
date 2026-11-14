import { describe, expect, test, vi } from 'vitest';

import type { CommanderSearchFields } from '../commander-empty-extras';
import {
  buildCommanderEmptyStateExtras,
  REGEX_UUID,
} from '../commander-empty-extras';

describe('buildCommanderEmptyStateExtras', () => {
  test('returns empty array for blank query', () => {
    const submit = vi.fn();
    expect(
      buildCommanderEmptyStateExtras('   ', { submitCommanderSearch: submit }),
    ).toEqual([]);
    expect(submit).not.toHaveBeenCalled();
  });

  test('parses queue id / job id and offers queue job and plan task routes via POST fields', () => {
    const submit = vi.fn();
    const q = `a1b2c3d4-e5f6-4789-a012-3456789abcde/b2c3d4e5-f6a7-4890-b123-456789abcdef`;
    const items = buildCommanderEmptyStateExtras(q, {
      submitCommanderSearch: submit,
    });
    expect(items).toHaveLength(2);
    const a = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const b = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    items[0]?.onSelect?.();
    items[1]?.onSelect?.();
    expect(submit).toHaveBeenNthCalledWith(1, {
      id: a,
      id2: b,
      jump: 'queue-job',
    } satisfies CommanderSearchFields);
    expect(submit).toHaveBeenNthCalledWith(2, {
      id: a,
      id2: b,
      jump: 'plan-task',
    } satisfies CommanderSearchFields);
  });

  test('parses queue id and job id separated by whitespace', () => {
    const submit = vi.fn();
    const a = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const b = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    const items = buildCommanderEmptyStateExtras(`  ${a}  ${b}  `, {
      submitCommanderSearch: submit,
    });
    expect(items).toHaveLength(2);
    items[0]?.onSelect?.();
    items[1]?.onSelect?.();
    expect(submit).toHaveBeenNthCalledWith(1, {
      id: a,
      id2: b,
      jump: 'queue-job',
    } satisfies CommanderSearchFields);
    expect(submit).toHaveBeenNthCalledWith(2, {
      id: a,
      id2: b,
      jump: 'plan-task',
    } satisfies CommanderSearchFields);
  });

  test('non-UUID text returns browse shortcuts for plans, queues, and generators', () => {
    const submit = vi.fn();
    const items = buildCommanderEmptyStateExtras('no-match-filter-text', {
      submitCommanderSearch: submit,
    });
    expect(items).toHaveLength(3);
    items[0]?.onSelect?.();
    items[1]?.onSelect?.();
    items[2]?.onSelect?.();
    expect(submit).toHaveBeenNthCalledWith(1, {
      jump: 'plans-index',
    } satisfies CommanderSearchFields);
    expect(submit).toHaveBeenNthCalledWith(2, {
      jump: 'queues-index',
    } satisfies CommanderSearchFields);
    expect(submit).toHaveBeenNthCalledWith(3, {
      jump: 'generators-index',
    } satisfies CommanderSearchFields);
  });

  describe('full UUID', () => {
    const id = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
    const planId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

    test('unresolved UUID returns plan, queue, generator, and search rows', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(id, {
        submitCommanderSearch: submit,
      });
      expect(items).toHaveLength(4);
      items[0]?.onSelect?.();
      items[1]?.onSelect?.();
      items[2]?.onSelect?.();
      items[3]?.onSelect?.();
      expect(submit).toHaveBeenNthCalledWith(1, {
        id,
        jump: 'plan-detail',
      } satisfies CommanderSearchFields);
      expect(submit).toHaveBeenNthCalledWith(2, {
        id,
        jump: 'queue-detail',
      } satisfies CommanderSearchFields);
      expect(submit).toHaveBeenNthCalledWith(3, {
        id,
        jump: 'generator-detail',
      } satisfies CommanderSearchFields);
      expect(submit).toHaveBeenNthCalledWith(4, {
        q: id,
      } satisfies CommanderSearchFields);
    });

    test('resolved task comes first, before the queue/generator/search fallbacks', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(id, {
        idRefMatches: [
          {
            id,
            kind: 'TASK',
            planId,
            planTitle: 'Parent plan',
            status: 'COMPLETED',
            title: 'Ship it',
          },
        ],
        renderStatus: (status) => `badge:${status}`,
        submitCommanderSearch: submit,
      });

      // Resolved task + queue + generator + search; the blind plan row is dropped.
      expect(items.map((item) => item.id)).toEqual([
        `jump-task-ref-${id}`,
        `jump-queue-${id}`,
        `jump-generator-${id}`,
        `jump-search-uuid-${id}`,
      ]);
      expect(items[0]?.trailing).toBe('badge:COMPLETED');
      items[0]?.onSelect?.();
      expect(submit).toHaveBeenCalledWith({
        id: planId,
        id2: id,
        jump: 'plan-task',
      } satisfies CommanderSearchFields);
    });

    test('in-flight lookup shows a Resolving row ahead of every fallback', () => {
      const items = buildCommanderEmptyStateExtras(id, {
        idRefLoading: true,
        submitCommanderSearch: vi.fn(),
      });

      expect(items).toHaveLength(5);
      expect(items[0]?.id).toBe(`resolving-id-ref-${id}`);
      expect(items[0]?.onSelect).toBeUndefined();
      expect(items[1]?.id).toBe(`jump-plan-${id}`);
    });
  });

  test('REGEX_UUID accepts lowercase hex uuid', () => {
    expect(REGEX_UUID.test('c65fb0f7-56ae-43bb-b516-dfd41fda7985')).toBe(true);
  });

  describe('short id fragment', () => {
    const FRAGMENT = 'c65fb0f7';
    const FULL_ID = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
    const PLAN_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

    test('plan match renders an Open plan row with a status badge + search escape', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        idRefMatches: [
          {
            id: FULL_ID,
            kind: 'PLAN',
            status: 'IN_PROGRESS',
            title: 'My Plan',
          },
        ],
        renderStatus: (status) => `badge:${status}`,
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe(`jump-plan-ref-${FULL_ID}`);
      expect(items[0]?.trailing).toBe('badge:IN_PROGRESS');
      items[0]?.onSelect?.();
      expect(submit).toHaveBeenNthCalledWith(1, {
        id: FULL_ID,
        jump: 'plan-detail',
      } satisfies CommanderSearchFields);

      // Last row is always the workspace-search escape.
      items[1]?.onSelect?.();
      expect(submit).toHaveBeenNthCalledWith(2, {
        q: FRAGMENT,
      } satisfies CommanderSearchFields);
    });

    test('task match jumps to its plan task and names the plan', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        idRefMatches: [
          {
            id: FULL_ID,
            kind: 'TASK',
            planId: PLAN_ID,
            planTitle: 'Parent plan',
            status: 'PENDING',
            title: 'Server query',
          },
        ],
        submitCommanderSearch: submit,
      });

      expect(items[0]?.id).toBe(`jump-task-ref-${FULL_ID}`);
      expect(items[0]?.label).toContain('Parent plan');
      // No renderStatus supplied → no trailing badge.
      expect(items[0]?.trailing).toBeUndefined();
      items[0]?.onSelect?.();
      expect(submit).toHaveBeenCalledWith({
        id: PLAN_ID,
        id2: FULL_ID,
        jump: 'plan-task',
      } satisfies CommanderSearchFields);
    });

    test('mixed matches list every plan and task + search escape', () => {
      const submit = vi.fn();
      const second = 'c65fb0f7-0000-4000-8000-000000000000';
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        idRefMatches: [
          { id: FULL_ID, kind: 'PLAN', status: 'IN_PROGRESS', title: 'First' },
          {
            id: second,
            kind: 'TASK',
            planId: PLAN_ID,
            planTitle: null,
            status: 'COMPLETED',
            title: 'Second',
          },
        ],
        submitCommanderSearch: submit,
      });

      expect(items.map((item) => item.id)).toEqual([
        `jump-plan-ref-${FULL_ID}`,
        `jump-task-ref-${second}`,
        `jump-search-fragment-${FRAGMENT}`,
      ]);
    });

    test('in-flight lookup shows a Resolving row + search escape', () => {
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        idRefLoading: true,
        idRefMatches: [],
        submitCommanderSearch: vi.fn(),
      });

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe(`resolving-id-ref-${FRAGMENT}`);
      // The resolving row is informational (no action).
      expect(items[0]?.onSelect).toBeUndefined();
    });

    test('no match while idle falls through to browse shortcuts', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        idRefLoading: false,
        idRefMatches: [],
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(3);
      items[0]?.onSelect?.();
      expect(submit).toHaveBeenNthCalledWith(1, {
        jump: 'plans-index',
      } satisfies CommanderSearchFields);
    });

    test('falls through to browse shortcuts when no resolver data is supplied', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(3);
    });
  });
});
