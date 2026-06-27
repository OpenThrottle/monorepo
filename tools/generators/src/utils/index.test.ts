import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getGithubUsername } from './index';

// `vi.hoisted` runs before the hoisted `vi.mock` factory below, so the mock can
// close over this spy.
const { execSyncMock } = vi.hoisted(() => ({ execSyncMock: vi.fn() }));

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]): unknown => execSyncMock(...args),
}));

describe('getGithubUsername', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    execSyncMock.mockReset();
    // Step past the `NODE_ENV === 'test'` short-circuit so the real fallback
    // logic runs.
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("short-circuits to 'test-username' when NODE_ENV is 'test'", () => {
    process.env.NODE_ENV = 'test';

    expect(getGithubUsername()).toBe('test-username');
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  test("falls back to 'localhost' when gh is absent (execSync throws)", () => {
    execSyncMock.mockImplementation(() => {
      throw new Error('command not found: gh');
    });

    expect(getGithubUsername()).toBe('localhost');
    expect(execSyncMock).toHaveBeenCalledOnce();
  });

  test("falls back to 'localhost' when gh returns the string 'null'", () => {
    execSyncMock.mockReturnValue(Buffer.from('null\n'));

    expect(getGithubUsername()).toBe('localhost');
  });

  test("falls back to 'localhost' when gh returns an empty value", () => {
    execSyncMock.mockReturnValue(Buffer.from('\n'));

    expect(getGithubUsername()).toBe('localhost');
  });

  test('returns the resolved username when gh succeeds', () => {
    execSyncMock.mockReturnValue(Buffer.from('visormatt\n'));

    expect(getGithubUsername()).toBe('visormatt');
  });
});
