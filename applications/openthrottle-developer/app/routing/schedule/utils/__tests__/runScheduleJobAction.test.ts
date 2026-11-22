import { describe, expect, test } from 'vitest';

import { runScheduleJobAction } from '../runScheduleJobAction';

const buildRequest = (intent: string): Request => {
  const body = new FormData();
  body.set('intent', intent);
  return new Request('http://localhost/schedule/job-1', {
    body,
    method: 'POST',
  });
};

describe('runScheduleJobAction', () => {
  test('answers an unknown intent without calling the API', async () => {
    const result = await runScheduleJobAction(buildRequest('nope'), 'job-1');

    expect(result).toEqual({ error: 'Unknown action.' });
  });
});
