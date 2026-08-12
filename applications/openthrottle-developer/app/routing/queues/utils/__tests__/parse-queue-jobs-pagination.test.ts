import { DEFAULT_PAGINATION_LIMIT } from '@openthrottle/react-router-utils';
import { describe, expect, test } from 'vitest';
import {
  QUEUE_JOBS_LIMIT_MAX,
  QUEUE_JOBS_LIMIT_MIN,
} from '~/routing/queues/config/queue-jobs';
import { parseQueueJobsPagination } from '../parse-queue-jobs-pagination';

describe('parseQueueJobsPagination', () => {
  test('defaults to page 1 and the default limit when no params are present', () => {
    expect(parseQueueJobsPagination('https://ot.example/queues/Plans')).toEqual(
      {
        limit: DEFAULT_PAGINATION_LIMIT,
        offset: 0,
        page: 1,
      },
    );
  });

  test('parses an explicit page and limit', () => {
    expect(
      parseQueueJobsPagination(
        'https://ot.example/queues/Plans?page=3&limit=20',
      ),
    ).toEqual({ limit: 20, offset: 40, page: 3 });
  });

  test('clamps limit above the maximum', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=9999'),
    ).toMatchObject({ limit: QUEUE_JOBS_LIMIT_MAX });
  });

  test('clamps limit below the minimum', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=1'),
    ).toMatchObject({ limit: QUEUE_JOBS_LIMIT_MIN });
  });

  test('falls back to the default limit for a non-numeric limit', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=abc'),
    ).toMatchObject({ limit: DEFAULT_PAGINATION_LIMIT });
  });

  test('falls back to the default limit for a zero or negative limit', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=0'),
    ).toMatchObject({ limit: DEFAULT_PAGINATION_LIMIT });
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=-5'),
    ).toMatchObject({ limit: DEFAULT_PAGINATION_LIMIT });
  });

  test('floors a fractional limit before clamping', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?limit=25.9'),
    ).toMatchObject({ limit: 25 });
  });

  test('treats a non-numeric page as page 1', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?page=abc'),
    ).toMatchObject({ page: 1 });
  });

  test('treats a negative or zero page as page 1', () => {
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?page=0'),
    ).toMatchObject({ page: 1 });
    expect(
      parseQueueJobsPagination('https://ot.example/queues/Plans?page=-3'),
    ).toMatchObject({ page: 1 });
  });

  test('computes offset from page and limit', () => {
    expect(
      parseQueueJobsPagination(
        'https://ot.example/queues/Plans?page=5&limit=10',
      ),
    ).toEqual({ limit: 10, offset: 40, page: 5 });
  });
});
