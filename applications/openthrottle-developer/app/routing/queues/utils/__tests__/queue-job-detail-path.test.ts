import { describe, expect, test } from 'vitest';
import { queueJobDetailPath } from '../queue-job-detail-path';

describe('queueJobDetailPath', () => {
  test('encodes queue name and job id in the path', () => {
    expect(queueJobDetailPath('Plans', 'job-1')).toBe('/queues/Plans/job-1');
    expect(queueJobDetailPath('Plans', 'ralph-orch:abc')).toBe(
      '/queues/Plans/ralph-orch%3Aabc',
    );
  });
});
