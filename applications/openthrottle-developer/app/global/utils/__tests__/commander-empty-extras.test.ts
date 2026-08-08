import { describe, expect, test, vi } from 'vitest';
import type { CommanderSearchFields } from '../commander-empty-extras';
import {
  REGEX_UUID,
  buildCommanderEmptyStateExtras,
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
    const q =
      'a1b2c3d4-e5f6-4789-a012-3456789abcde/b2c3d4e5-f6a7-4890-b123-456789abcdef';
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

  test('single UUID returns plan, queue, generator, and search rows', () => {
    const submit = vi.fn();
    const id = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
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

  test('REGEX_UUID accepts lowercase hex uuid', () => {
    expect(REGEX_UUID.test('c65fb0f7-56ae-43bb-b516-dfd41fda7985')).toBe(true);
  });

  describe('short id fragment', () => {
    const FRAGMENT = 'c65fb0f7';
    const FULL_ID = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';

    test('unique match renders a confident Open plan row + search escape', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        planRefMatches: [
          { id: FULL_ID, status: 'in_progress', title: 'My Plan' },
        ],
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(2);
      expect(items[0]?.label).toBe('Open plan: My Plan (c65fb0f7…)');
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

    test('multiple matches list every plan (top N) + search escape', () => {
      const submit = vi.fn();
      const second = 'c65fb0f7-0000-4000-8000-000000000000';
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        planRefMatches: [
          { id: FULL_ID, status: 'in_progress', title: 'First' },
          { id: second, status: 'completed', title: 'Second' },
        ],
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(3);
      items[0]?.onSelect?.();
      items[1]?.onSelect?.();
      expect(submit).toHaveBeenNthCalledWith(1, {
        id: FULL_ID,
        jump: 'plan-detail',
      } satisfies CommanderSearchFields);
      expect(submit).toHaveBeenNthCalledWith(2, {
        id: second,
        jump: 'plan-detail',
      } satisfies CommanderSearchFields);
    });

    test('in-flight lookup shows a Resolving row + search escape', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        planRefLoading: true,
        planRefMatches: [],
        submitCommanderSearch: submit,
      });

      expect(items).toHaveLength(2);
      expect(items[0]?.label).toBe('Resolving plan “c65fb0f7…”');
      // The resolving row is informational (no action).
      expect(items[0]?.onSelect).toBeUndefined();
    });

    test('no match while idle falls through to browse shortcuts', () => {
      const submit = vi.fn();
      const items = buildCommanderEmptyStateExtras(FRAGMENT, {
        planRefLoading: false,
        planRefMatches: [],
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
