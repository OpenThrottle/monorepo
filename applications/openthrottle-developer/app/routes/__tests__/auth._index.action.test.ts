// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/auth._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphql: vi.fn() };
});

const { executeGraphql } = await import('@openthrottle/react-router-graphql');
const { action } = await import('../auth._index');

const mockExecute = vi.mocked(executeGraphql);

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const actionArgs = (entries: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    body.set(key, value);
  }
  const request = new Request('http://localhost/auth', {
    body,
    method: 'POST',
  });
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/auth',
    request,
    url: new URL(request.url),
  };
};

describe('routes/auth._index action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('logs in with a trimmed email and the password as typed', async () => {
    mockExecute.mockResolvedValue(
      asMock<Awaited<ReturnType<typeof executeGraphql>>>({
        login: { accessToken: 'token-1' },
      }),
    );

    const result = await action(
      actionArgs({
        email: '  a@b.co ',
        intent: 'login',
        password: ' pass word ',
      }),
    );

    expect(mockExecute).toHaveBeenCalledWith(expect.anything(), {
      input: { email: 'a@b.co', password: ' pass word ' },
    });
    expect(result).toMatchObject({ data: { ok: true } });
  });

  test.each([
    ['missing email', { password: 'secret' }],
    ['missing password', { email: 'a@b.co' }],
    ['blank email', { email: '  ', password: 'secret' }],
    ['no fields', {}],
  ])('returns a structured error for %s', async (_label, entries) => {
    const result = await action(actionArgs(entries));

    expect(result).toMatchObject({ data: { error: expect.any(String) } });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
