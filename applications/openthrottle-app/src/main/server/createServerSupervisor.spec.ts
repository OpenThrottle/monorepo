import type { ServerChild } from './createServerSupervisor.ts';
import { createServerSupervisor } from './createServerSupervisor.ts';
import type { ProbeResult } from './probeOrigin.ts';

interface FakeChild extends ServerChild {
  readonly crash: (code: number) => void;
  readonly kills: () => number;
  readonly reportPort: (port: number) => void;
}

const createFakeChild = (): FakeChild => {
  let exitListener: (code: number | undefined) => void = () => {
    return undefined;
  };
  let portListener: (port: number) => void = () => {
    return undefined;
  };
  let killCount = 0;

  return {
    crash: (code) => {
      exitListener(code);
    },
    kill: () => {
      killCount += 1;
    },
    kills: () => killCount,
    onExit: (listener) => {
      exitListener = listener;
    },
    onPort: (listener) => {
      portListener = listener;
    },
    reportPort: (port) => {
      portListener(port);
    },
  };
};

const setup = (
  probe: (origin: string) => Promise<ProbeResult> = () =>
    Promise.resolve({ ok: true }),
) => {
  const children: FakeChild[] = [];
  const onFatal = vi.fn();
  const onRestart = vi.fn();
  const supervisor = createServerSupervisor({
    fork: () => {
      const child = createFakeChild();
      children.push(child);

      return child;
    },
    onFatal,
    onRestart,
    probe,
    startTimeoutMs: 1000,
  });

  return { children, onFatal, onRestart, supervisor };
};

const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

describe('createServerSupervisor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('resolves with the origin once the port is reported and probed', async () => {
      const { children, supervisor } = setup();
      const started = supervisor.start();

      children[0]?.reportPort(4321);

      await expect(started).resolves.toEqual({
        ok: true,
        origin: 'http://127.0.0.1:4321',
      });
    });

    it('fails and kills the child when no port is reported in time', async () => {
      const { children, supervisor } = setup();
      const started = supervisor.start();

      await vi.advanceTimersByTimeAsync(1000);

      await expect(started).resolves.toMatchObject({ ok: false });
      expect(children[0]?.kills()).toBe(1);
    });

    it('fails and kills the child when the probe fails', async () => {
      const { children, supervisor } = setup(() =>
        Promise.resolve({ ok: false as const, reason: 'probe timeout' }),
      );
      const started = supervisor.start();

      children[0]?.reportPort(4321);

      await expect(started).resolves.toEqual({
        ok: false,
        reason: 'probe timeout',
      });
      expect(children[0]?.kills()).toBe(1);
    });

    it('fails when the child exits before it is ready, without restarting', async () => {
      const { children, onFatal, supervisor } = setup();
      const started = supervisor.start();

      children[0]?.crash(1);

      await expect(started).resolves.toMatchObject({ ok: false });
      expect(children).toHaveLength(1);
      expect(onFatal).not.toHaveBeenCalled();
    });
  });

  describe('crash handling', () => {
    it('restarts exactly once and reports the new origin', async () => {
      const { children, onFatal, onRestart, supervisor } = setup();
      const started = supervisor.start();
      children[0]?.reportPort(4000);
      await started;

      children[0]?.crash(1);
      children[1]?.reportPort(4001);
      await flush();

      expect(children).toHaveLength(2);
      expect(onRestart).toHaveBeenCalledExactlyOnceWith(
        'http://127.0.0.1:4001',
      );
      expect(onFatal).not.toHaveBeenCalled();
    });

    it('goes fatal on the second crash without a third fork', async () => {
      const { children, onFatal, supervisor } = setup();
      const started = supervisor.start();
      children[0]?.reportPort(4000);
      await started;

      children[0]?.crash(1);
      children[1]?.reportPort(4001);
      await flush();
      children[1]?.crash(137);
      await flush();

      expect(children).toHaveLength(2);
      expect(onFatal).toHaveBeenCalledOnce();
      expect(onFatal.mock.calls[0]?.[0]).toContain('137');
    });

    it('goes fatal when the restarted child never becomes ready', async () => {
      const { children, onFatal, supervisor } = setup();
      const started = supervisor.start();
      children[0]?.reportPort(4000);
      await started;

      children[0]?.crash(1);
      await vi.advanceTimersByTimeAsync(1000);

      expect(onFatal).toHaveBeenCalledOnce();
    });
  });

  describe('stop', () => {
    it('kills the child and does not restart', async () => {
      const { children, onFatal, onRestart, supervisor } = setup();
      const started = supervisor.start();
      children[0]?.reportPort(4000);
      await started;

      supervisor.stop();
      children[0]?.crash(0);
      await flush();

      expect(children[0]?.kills()).toBe(1);
      expect(children).toHaveLength(1);
      expect(onRestart).not.toHaveBeenCalled();
      expect(onFatal).not.toHaveBeenCalled();
    });
  });
});
