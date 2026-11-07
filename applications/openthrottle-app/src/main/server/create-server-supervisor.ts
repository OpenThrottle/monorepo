import type { ProbeResult } from './probe-origin.ts';

export type StartResult =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly origin: string };

/** The slice of a utility process the supervisor depends on. */
export interface ServerChild {
  readonly kill: () => void;
  readonly onExit: (listener: (code: number | undefined) => void) => void;
  readonly onPort: (listener: (port: number) => void) => void;
}

export interface ServerSupervisorOptions {
  readonly fork: () => ServerChild;
  readonly onFatal: (reason: string) => void;
  /** Called with the new origin after the one allowed automatic restart. */
  readonly onRestart: (origin: string) => void;
  readonly probe: (origin: string) => Promise<ProbeResult>;
  readonly startTimeoutMs: number;
}

export interface ServerSupervisor {
  /** Starts the child and resolves once its origin passes the health probe. */
  readonly start: () => Promise<StartResult>;
  /** Kills the child; no restart follows. Safe to call repeatedly. */
  readonly stop: () => void;
}

/**
 * @description State machine around the embedded server child: start, wait for
 * the reported port, health-probe, then restart exactly once if the child dies
 * unexpectedly (any exit counts, not only non-zero ones: the window needs a
 * server either way). A second death calls `onFatal`. `stop` retires the child
 * so its exit is never treated as a crash.
 */
export const createServerSupervisor = (
  options: ServerSupervisorOptions,
): ServerSupervisor => {
  const { fork, onFatal, onRestart, probe, startTimeoutMs } = options;
  let current: ServerChild | undefined;
  let restarts = 0;
  let stopped = false;

  const retire = (child: ServerChild): void => {
    if (current === child) {
      current = undefined;
    }

    child.kill();
  };

  const launch = (): Promise<StartResult> => {
    const child = fork();
    current = child;

    return new Promise<StartResult>((resolve) => {
      let settled = false;

      const settle = (result: StartResult): void => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const fail = (reason: string): void => {
        retire(child);
        settle({ ok: false, reason });
      };

      const timer = setTimeout(() => {
        fail(`the server did not report a port within ${startTimeoutMs}ms`);
      }, startTimeoutMs);

      child.onExit((code) => {
        if (current !== child) {
          return;
        }

        current = undefined;

        if (!settled) {
          settle({
            ok: false,
            reason: `the server exited with code ${code ?? 'unknown'} before it was ready`,
          });

          return;
        }

        handleCrash(`the server exited with code ${code ?? 'unknown'}`);
      });

      child.onPort((port) => {
        const origin = `http://127.0.0.1:${port}`;

        void probe(origin).then((probed) => {
          if (settled) {
            return;
          }

          if (probed.ok) {
            settle({ ok: true, origin });

            return;
          }

          fail(probed.reason);
        });
      });
    });
  };

  const handleCrash = (reason: string): void => {
    if (stopped) {
      return;
    }

    if (restarts >= 1) {
      onFatal(`${reason}; it already restarted once`);

      return;
    }

    restarts += 1;

    void launch().then((result) => {
      if (stopped) {
        return;
      }

      if (result.ok) {
        onRestart(result.origin);

        return;
      }

      onFatal(`${reason}; restart failed: ${result.reason}`);
    });
  };

  const start = (): Promise<StartResult> => {
    stopped = false;

    return launch();
  };

  const stop = (): void => {
    stopped = true;

    if (current !== undefined) {
      retire(current);
    }
  };

  return { start, stop };
};
