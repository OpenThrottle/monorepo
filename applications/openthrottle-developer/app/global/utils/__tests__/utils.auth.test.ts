import { executeGraphql } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  callLoginMutation,
  callLogoutMutation,
  callRegisterMutation,
} from '../utils.auth';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphql: vi.fn(),
  getForwardedClientHeaders: (request: Request): Record<string, string> => {
    const forwardedFor = request.headers.get('x-forwarded-for');
    return forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {};
  },
}));

/** A request as Caddy delivers it: the browser's address in X-Forwarded-For. */
const request = new Request('https://developer.example.com/auth', {
  headers: { 'x-forwarded-for': '203.0.113.7' },
});
const forwarded = { headers: { 'X-Forwarded-For': '203.0.113.7' } };

const mockExecute = vi.mocked(executeGraphql);

describe('callRegisterMutation', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns access token when register succeeds', async () => {
    mockExecute.mockResolvedValueOnce({
      register: { accessToken: 'register-token' },
    });

    const result = await callRegisterMutation(
      'user@example.com',
      'secret',
      request,
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      { input: { email: 'user@example.com', password: 'secret' } },
      forwarded,
    );
    expect(result).toBe('register-token');
  });

  test('returns null when accessToken is missing', async () => {
    mockExecute.mockResolvedValueOnce({
      register: { accessToken: null },
    });

    const result = await callRegisterMutation(
      'user@example.com',
      'secret',
      request,
    );

    expect(result).toBeNull();
  });
});

describe('callLoginMutation', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns access token when login succeeds', async () => {
    mockExecute.mockResolvedValueOnce({
      login: { accessToken: 'login-token' },
    });

    const result = await callLoginMutation(
      'user@example.com',
      'secret',
      request,
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      { input: { email: 'user@example.com', password: 'secret' } },
      forwarded,
    );
    expect(result).toBe('login-token');
  });

  test('returns null when login is null', async () => {
    mockExecute.mockResolvedValueOnce({ login: null });

    const result = await callLoginMutation(
      'user@example.com',
      'secret',
      request,
    );

    expect(result).toBeNull();
  });

  test('returns null when accessToken is missing', async () => {
    mockExecute.mockResolvedValueOnce({
      login: { accessToken: null },
    });

    const result = await callLoginMutation(
      'user@example.com',
      'secret',
      request,
    );

    expect(result).toBeNull();
  });
});

describe('callLogoutMutation', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns success flag from signout', async () => {
    mockExecute.mockResolvedValueOnce({
      signout: { success: true },
    });

    const result = await callLogoutMutation();

    expect(mockExecute).toHaveBeenCalledWith(expect.anything(), {});
    expect(result).toBe(true);
  });

  test('returns null when success is null', async () => {
    mockExecute.mockResolvedValueOnce({
      signout: { success: null },
    });

    const result = await callLogoutMutation();

    expect(result).toBeNull();
  });
});
