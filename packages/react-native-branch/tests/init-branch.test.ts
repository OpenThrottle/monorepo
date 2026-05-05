import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBranch } = vi.hoisted(() => ({
  mockBranch: {
    initSessionTtl: undefined as number | undefined,
  },
}));

vi.mock('react-native-branch', () => ({
  default: mockBranch,
}));

describe('initializeBranch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    mockBranch.initSessionTtl = undefined;
  });

  it('sets initSessionTtl on first call', async () => {
    const { initializeBranch } = await import('../src/lib/init-branch');
    initializeBranch({ initSessionTtl: 5000 });
    expect(mockBranch.initSessionTtl).toBe(5000);
  });

  it('warns on duplicate init by default when __DEV__ is true', async () => {
    vi.stubGlobal('__DEV__', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initializeBranch } = await import('../src/lib/init-branch');
    initializeBranch();
    initializeBranch();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('throws on duplicate init when configured', async () => {
    const { initializeBranch } = await import('../src/lib/init-branch');
    initializeBranch({ onDuplicateInit: 'ignore' });
    expect(() => initializeBranch({ onDuplicateInit: 'throw' })).toThrow(
      /already called/,
    );
  });

  it('getBranch throws before initializeBranch', async () => {
    const { getBranch } = await import('../src/lib/init-branch');
    expect(() => getBranch()).toThrow(/Call initializeBranch/);
  });

  it('getBranch returns branch after initializeBranch', async () => {
    const { getBranch, initializeBranch } =
      await import('../src/lib/init-branch');
    initializeBranch();
    expect(getBranch()).toBe(mockBranch);
  });
});
