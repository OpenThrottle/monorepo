import { describe, expect, it, vi } from 'vitest';

import { createGuardedSessionProvider } from './createGuardedSessionProvider.ts';

describe('createGuardedSessionProvider', () => {
  it('installs the guards on a partition session before returning it, once', () => {
    const sessions = new Map<string, { name: string }>();
    const install = vi.fn();
    const get = createGuardedSessionProvider({
      fromPartition: (partition) => {
        const existing = sessions.get(partition) ?? { name: partition };

        sessions.set(partition, existing);

        return existing;
      },
      install,
    });

    const first = get('persist:ot-a');
    get('persist:ot-a');
    const second = get('persist:ot-b');

    expect(install).toHaveBeenCalledTimes(2);
    expect(install).toHaveBeenNthCalledWith(1, first);
    expect(install).toHaveBeenNthCalledWith(2, second);
  });
});
