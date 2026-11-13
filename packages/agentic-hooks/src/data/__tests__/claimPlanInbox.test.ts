import { describe, expect, it, vi } from 'vitest';

import type { HookFetch } from '../../types.ts';
import { claimPlanInbox } from '../claimPlanInbox.ts';

const target = { planId: 'p1', planRunId: 'r1', taskId: null };

const respond = (payload: unknown) => {
  return vi.fn<HookFetch>(async () => {
    return { json: async () => payload, ok: true, status: 200 };
  });
};

describe('claimPlanInbox', () => {
  it('returns the claimed messages and omits null ids from the input', async () => {
    const fetchImpl = respond({
      data: {
        claimPlanMessages: {
          messages: [{ author: 'a', body: 'b', id: 'm', kind: 'STEER' }],
        },
      },
    });
    const messages = await claimPlanInbox({
      authToken: 't',
      fetchImpl,
      graphqlUrl: 'http://x/graphql',
      target,
      timeoutMs: 2000,
    });
    expect(messages).toEqual([
      { author: 'a', body: 'b', id: 'm', kind: 'STEER' },
    ]);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(JSON.parse(init?.body ?? '{}').variables).toEqual({
      input: { planId: 'p1', planRunId: 'r1' },
    });
  });

  it('is null with no endpoint', async () => {
    const messages = await claimPlanInbox({
      authToken: '',
      fetchImpl: respond({}),
      graphqlUrl: null,
      target,
      timeoutMs: 2000,
    });
    expect(messages).toBeNull();
  });

  it('is null on a server error', async () => {
    const messages = await claimPlanInbox({
      authToken: 't',
      fetchImpl: respond({ errors: [{ message: 'nope' }] }),
      graphqlUrl: 'http://x/graphql',
      target,
      timeoutMs: 2000,
    });
    expect(messages).toBeNull();
  });
});
