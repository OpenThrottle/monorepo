/**
 * @description Tests for {@link runIteration} / {@link runIterationAsync} backend dispatch.
 * Verifies that the registered-but-unimplemented `claude` backend fails fast with a clear
 * message, while `cursor` continues to be the default. Spawn paths themselves are exercised
 * elsewhere; here we only verify dispatch behavior.
 */

import { describe, expect, it, vi } from 'vitest';
import { runIteration, runIterationAsync } from '../run-iteration';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    throw new Error('spawn should not be invoked when backend dispatch fails');
  }),
  spawnSync: vi.fn(() => {
    throw new Error(
      'spawnSync should not be invoked when backend dispatch fails',
    );
  }),
}));

describe('runIteration (sync) backend dispatch', () => {
  it('throws not-implemented for --backend claude', () => {
    expect(() =>
      runIteration({
        agentPrompt: 'hello',
        backend: 'claude',
        iteration: 1,
      }),
    ).toThrow(/Execution backend "claude" is registered but/);
  });
});

describe('runIterationAsync backend dispatch', () => {
  it('rejects not-implemented for --backend claude', async () => {
    await expect(
      runIterationAsync({
        agentPrompt: 'hello',
        backend: 'claude',
        iteration: 1,
      }),
    ).rejects.toThrow(/Execution backend "claude" is registered but/);
  });
});
