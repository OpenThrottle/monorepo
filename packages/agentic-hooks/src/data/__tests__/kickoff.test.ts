import { describe, expect, it, vi } from 'vitest';

import {
  decideKickoffBrief,
  lookupOtId,
  type OtIdLookup,
  parseKickoffPlanId,
} from '../kickoff.ts';

const PLAN_ID = '586bcff7-dbef-4e2c-ae22-d3f9210b2a39';

const lookupReturning = (result: OtIdLookup) =>
  vi.fn(async (_id: string): Promise<OtIdLookup> => result);

const jsonResponse = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), { status: ok ? 200 : 500 });

describe('parseKickoffPlanId', () => {
  it('reads the uuid from a leading /ot-loop line', () => {
    expect(
      parseKickoffPlanId(`\n  /ot-loop ${PLAN_ID}  \nRuns the follow-up.`),
    ).toBe(PLAN_ID);
  });

  it('rejects a brief whose first line is prose', () => {
    expect(
      parseKickoffPlanId(`Fix the flaky test.\n/ot-loop ${PLAN_ID}`),
    ).toBeNull();
  });

  it('rejects an /ot-loop line with anything after the uuid', () => {
    expect(parseKickoffPlanId(`/ot-loop ${PLAN_ID} please`)).toBeNull();
  });
});

describe('decideKickoffBrief', () => {
  it('allows an /ot-loop brief whose plan exists', async () => {
    const lookup = lookupReturning('found');
    expect(
      await decideKickoffBrief(`/ot-loop ${PLAN_ID}\nContext.`, lookup),
    ).toEqual({ decision: 'allow' });
    expect(lookup).toHaveBeenCalledWith(PLAN_ID);
  });

  it('denies a prose brief with the remediation', async () => {
    const result = await decideKickoffBrief(
      'Refactor the payload parser.',
      lookupReturning('found'),
    );
    expect(result).toMatchObject({
      decision: 'deny',
      reason: expect.stringContaining('create_plan + create_tasks'),
    });
  });

  it('denies an /ot-loop brief naming no plan or task', async () => {
    const result = await decideKickoffBrief(
      `/ot-loop ${PLAN_ID}`,
      lookupReturning('missing'),
    );
    expect(result).toMatchObject({
      decision: 'deny',
      reason: expect.stringContaining('names no OpenThrottle plan'),
    });
  });

  it.each([
    ['no brief', null],
    ['a blank brief', '   '],
  ])('passes %s through without a lookup', async (_label, brief) => {
    const lookup = lookupReturning('missing');
    expect(await decideKickoffBrief(brief, lookup)).toEqual({
      decision: 'allow',
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('fails open when OT is unreachable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const result = await decideKickoffBrief(`/ot-loop ${PLAN_ID}`, (id) =>
      lookupOtId({
        authToken: '',
        fetchImpl,
        graphqlUrl: 'http://localhost:1/graphql',
        id,
        timeoutMs: 50,
      }),
    );
    expect(result).toEqual({ decision: 'allow' });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe('lookupOtId', () => {
  const lookup = (fetchImpl: typeof globalThis.fetch, graphqlUrl = 'u') =>
    lookupOtId({
      authToken: 't',
      fetchImpl,
      graphqlUrl,
      id: PLAN_ID,
      timeoutMs: 50,
    });

  it('finds a plan', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: { plan: { id: PLAN_ID }, task: null } }),
    );
    expect(await lookup(fetchImpl)).toBe('found');
  });

  it('finds a task', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: { plan: null, task: { id: PLAN_ID } } }),
    );
    expect(await lookup(fetchImpl)).toBe('found');
  });

  it('reports missing only on a clean not-found', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: { plan: null, task: null } }),
    );
    expect(await lookup(fetchImpl)).toBe('missing');
  });

  it('treats a not-found with errors as unknown', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: { plan: null, task: null },
        errors: [{ message: 'Unauthorized' }],
      }),
    );
    expect(await lookup(fetchImpl)).toBe('unknown');
  });

  it('treats a non-OK response as unknown', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false));
    expect(await lookup(fetchImpl)).toBe('unknown');
  });

  it('is unknown with no endpoint configured', async () => {
    const fetchImpl = vi.fn();
    expect(
      await lookupOtId({
        authToken: '',
        fetchImpl,
        graphqlUrl: null,
        id: PLAN_ID,
        timeoutMs: 50,
      }),
    ).toBe('unknown');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
