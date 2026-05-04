import { describe, expect, test, vi } from 'vitest';
import {
  CORTEX_UUID_PATTERN,
  buildCommanderEmptyStateExtras,
} from '../commander-empty-extras';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

describe('buildCommanderEmptyStateExtras', () => {
  test('returns empty array for blank query', () => {
    const navigate = vi.fn();
    expect(buildCommanderEmptyStateExtras('   ', navigate)).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
  });

  test('parses queue id / job id and offers queue job and plan task routes', () => {
    const navigate = vi.fn();
    const q =
      'a1b2c3d4-e5f6-4789-a012-3456789abcde/b2c3d4e5-f6a7-4890-b123-456789abcdef';
    const items = buildCommanderEmptyStateExtras(q, navigate);
    expect(items).toHaveLength(2);
    const a = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const b = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    items[0]?.onSelect?.();
    expect(navigate).toHaveBeenNthCalledWith(1, queueJobDetailPath(a, b));
    items[1]?.onSelect?.();
    expect(navigate).toHaveBeenNthCalledWith(2, `/plans/${a}/tasks/${b}`);
  });

  test('parses queue id and job id separated by whitespace', () => {
    const navigate = vi.fn();
    const a = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const b = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    const items = buildCommanderEmptyStateExtras(`  ${a}  ${b}  `, navigate);
    expect(items).toHaveLength(2);
    items[0]?.onSelect?.();
    expect(navigate).toHaveBeenNthCalledWith(1, queueJobDetailPath(a, b));
    items[1]?.onSelect?.();
    expect(navigate).toHaveBeenNthCalledWith(2, `/plans/${a}/tasks/${b}`);
  });

  test('single UUID returns plan, queue, generator, and search rows', () => {
    const navigate = vi.fn();
    const id = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
    const items = buildCommanderEmptyStateExtras(id, navigate);
    expect(items).toHaveLength(4);
    items[0]?.onSelect?.();
    items[1]?.onSelect?.();
    items[2]?.onSelect?.();
    items[3]?.onSelect?.();
    expect(navigate).toHaveBeenNthCalledWith(1, `/plans/${id}`);
    expect(navigate).toHaveBeenNthCalledWith(2, `/queues/${id}`);
    expect(navigate).toHaveBeenNthCalledWith(3, `/generators/${id}`);
    expect(navigate).toHaveBeenNthCalledWith(
      4,
      `/search?q=${encodeURIComponent(id)}`,
    );
  });

  test('CORTEX_UUID_PATTERN accepts lowercase hex uuid', () => {
    expect(
      CORTEX_UUID_PATTERN.test('c65fb0f7-56ae-43bb-b516-dfd41fda7985'),
    ).toBe(true);
  });
});
