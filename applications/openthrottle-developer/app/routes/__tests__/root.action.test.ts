// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as authUtils from '~/global/utils/utils.auth';
import { action } from '../../root';
import type { Route } from '@/app/+types/root';

vi.mock('~/global/utils/utils.auth', () => ({
  callLoginMutation: vi.fn(),
  callLogoutMutation: vi.fn(),
  callRegisterMutation: vi.fn(),
}));

const mockLogin = vi.mocked(authUtils.callLoginMutation);
const mockLogout = vi.mocked(authUtils.callLogoutMutation);
const mockRegister = vi.mocked(authUtils.callRegisterMutation);

const UUID_A = '80864bba-630a-451d-bfd2-4b25ec202381';
const UUID_B = '11111111-2222-3333-4444-555555555555';

/** Build root action args from a form-encoded body (mirrors the action's `request.formData()`). */
const actionArgs = (fields: Record<string, string>): Route.ActionArgs => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return {
    context: undefined,
    params: {},
    request: new Request('http://localhost/', {
      body: formData,
      method: 'POST',
    }),
  } as unknown as Route.ActionArgs;
};

describe('root action: login', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  test('sets the auth cookie and redirects to /dashboard on success', async () => {
    mockLogin.mockResolvedValue('jwt-token');

    const result = await action(
      actionArgs({
        email: '  pilot@example.com  ',
        intent: 'login',
        password: 'pw',
      }),
    );

    expect(mockLogin).toHaveBeenCalledWith('pilot@example.com', 'pw');
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/dashboard');
    expect(response.headers.get('set-cookie')).toContain('jwt-token');
  });

  test('returns a field error when email or password is missing', async () => {
    const result = await action(actionArgs({ intent: 'login' }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Email and password are required' });
  });

  test('returns a generic error when the mutation yields no token', async () => {
    mockLogin.mockResolvedValue(null);

    const result = await action(
      actionArgs({ email: 'a@b.com', intent: 'login', password: 'pw' }),
    );

    expect(result).toEqual({ error: 'Login failed' });
  });

  test('surfaces the thrown error message', async () => {
    mockLogin.mockRejectedValue(new Error('bad credentials'));

    const result = await action(
      actionArgs({ email: 'a@b.com', intent: 'login', password: 'pw' }),
    );

    expect(result).toEqual({ error: 'bad credentials' });
  });
});

describe('root action: logout', () => {
  beforeEach(() => {
    mockLogout.mockReset();
  });

  test('clears the auth cookie and document-redirects to /auth on success', async () => {
    mockLogout.mockResolvedValue(true);

    const result = await action(actionArgs({ intent: 'logout' }));

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.headers.get('location')).toBe('/auth');
    // Clearing the cookie expires it immediately.
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  test('clears the auth cookie and returns an error when logout reports no success', async () => {
    mockLogout.mockResolvedValue(false);

    const result = await action(actionArgs({ intent: 'logout' }));

    expect(result).toMatchObject({ data: { error: 'Logout failed' } });
    const setCookie = new Headers(
      (result as { init?: ResponseInit }).init?.headers,
    ).get('set-cookie');
    expect(setCookie).toContain('Max-Age=0');
  });

  test('clears the auth cookie and surfaces the error when logout throws', async () => {
    mockLogout.mockRejectedValue(new Error('logout failed'));

    const result = await action(actionArgs({ intent: 'logout' }));

    expect(result).toMatchObject({ data: { error: 'logout failed' } });
    const setCookie = new Headers(
      (result as { init?: ResponseInit }).init?.headers,
    ).get('set-cookie');
    expect(setCookie).toContain('Max-Age=0');
  });
});

describe('root action: register', () => {
  beforeEach(() => {
    mockRegister.mockReset();
  });

  test('sets the auth cookie and redirects to / on success', async () => {
    mockRegister.mockResolvedValue('new-token');

    const result = await action(
      actionArgs({
        email: '  new@example.com ',
        intent: 'register',
        password: 'pw',
      }),
    );

    expect(mockRegister).toHaveBeenCalledWith('new@example.com', 'pw');
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.headers.get('location')).toBe('/');
    expect(response.headers.get('set-cookie')).toContain('new-token');
  });

  test('returns a field error when email or password is missing', async () => {
    const result = await action(actionArgs({ intent: 'register' }));

    expect(mockRegister).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'Email and password are required' });
  });

  test('returns a generic error when the mutation yields no token', async () => {
    mockRegister.mockResolvedValue(null);

    const result = await action(
      actionArgs({ email: 'a@b.com', intent: 'register', password: 'pw' }),
    );

    expect(result).toEqual({ error: 'Registration failed' });
  });

  test('surfaces the thrown error message', async () => {
    mockRegister.mockRejectedValue(new Error('email taken'));

    const result = await action(
      actionArgs({ email: 'a@b.com', intent: 'register', password: 'pw' }),
    );

    expect(result).toEqual({ error: 'email taken' });
  });
});

describe('root action: commander-search', () => {
  test('redirects to the index jumps without needing an id', async () => {
    const plans = await action(
      actionArgs({ intent: 'commander-search', jump: 'plans-index' }),
    );
    expect((plans as Response).headers.get('location')).toBe('/plans');

    const queues = await action(
      actionArgs({ intent: 'commander-search', jump: 'queues-index' }),
    );
    expect((queues as Response).headers.get('location')).toBe('/queues');

    const generators = await action(
      actionArgs({ intent: 'commander-search', jump: 'generators-index' }),
    );
    expect((generators as Response).headers.get('location')).toBe(
      '/generators',
    );
  });

  test('jumps to a plan detail when id is a valid UUID', async () => {
    const result = await action(
      actionArgs({
        id: UUID_A,
        intent: 'commander-search',
        jump: 'plan-detail',
      }),
    );

    expect((result as Response).headers.get('location')).toBe(
      `/plans/${UUID_A}`,
    );
  });

  test('jumps to a plan task when both ids are valid UUIDs', async () => {
    const result = await action(
      actionArgs({
        id: UUID_A,
        id2: UUID_B,
        intent: 'commander-search',
        jump: 'plan-task',
      }),
    );

    expect((result as Response).headers.get('location')).toBe(
      `/plans/${UUID_A}/tasks/${UUID_B}`,
    );
  });

  test('falls back to /search when a jump id is not a UUID', async () => {
    const result = await action(
      actionArgs({
        id: 'not-a-uuid',
        intent: 'commander-search',
        jump: 'plan-detail',
        q: 'find me',
      }),
    );

    expect((result as Response).headers.get('location')).toBe(
      '/search?q=find%20me',
    );
  });

  test('redirects to a bare /search when there is no query', async () => {
    const result = await action(actionArgs({ intent: 'commander-search' }));

    expect((result as Response).headers.get('location')).toBe('/search');
  });
});

describe('root action: unknown intent', () => {
  test('returns null for an unrecognized intent', async () => {
    const result = await action(actionArgs({ intent: 'nope' }));

    expect(result).toBeNull();
  });
});
