import { utilityProcess } from 'electron';

import type { ServerChild } from './create-server-supervisor.ts';

const readPort = (message: unknown): number | undefined => {
  if (typeof message !== 'object' || message === null || !('port' in message)) {
    return undefined;
  }

  return typeof message.port === 'number' ? message.port : undefined;
};

/**
 * @description Forks the shell server entry into an Electron `utilityProcess`
 * and adapts it to the {@link ServerChild} the supervisor drives. Readiness
 * arrives as a `{ port }` message on the parent port, not via stdout parsing.
 */
export const forkServerChild = (
  entryPath: string,
  env: Readonly<Record<string, string>>,
): ServerChild => {
  const child = utilityProcess.fork(entryPath, [], {
    env: { ...env },
    serviceName: 'OpenThrottle server',
    stdio: 'inherit',
  });

  return {
    kill: () => {
      child.kill();
    },
    onExit: (listener) => {
      child.once('exit', (code) => {
        listener(code);
      });
    },
    onPort: (listener) => {
      child.on('message', (message: unknown) => {
        const port = readPort(message);

        if (port !== undefined) {
          listener(port);
        }
      });
    },
  };
};
