/**
 * Spawns an ACP agent CLI as a long-lived stdio JSON-RPC server. Kept apart
 * from the session logic so tests can swap in an in-process ACP agent (the SDK
 * connects a client app directly to an `AgentApp`) with no child process.
 */

import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';

import {
  type ClientApp,
  type ClientConnection,
  ndJsonStream,
} from '@agentclientprotocol/sdk';

import {
  resolveAgentTimeouts,
  terminateChild,
} from '../cursor-agent/teardown.ts';
import type { ConversationBackendRun } from '../types.ts';
import type { AcpAgentSpec } from './agent-specs.ts';

/** Bytes of stderr kept for error messages; older output is discarded. */
const STDERR_TAIL_BYTES = 4096;

/**
 * A running ACP agent: connect a client app to it once, and dispose it to tear
 * the process (group) down.
 *
 * @public
 */
export interface AcpAgentProcess {
  readonly connect: (app: ClientApp) => ClientConnection;
  readonly dispose: () => void;
  /** The tail of the agent's stderr, for failure messages. */
  readonly stderrTail: () => string;
}

/**
 * Starts the agent for a run. The default spawns the spec's binary; tests pass
 * one backed by an in-process `AgentApp`.
 *
 * @public
 */
export type AcpLauncher = (
  spec: AcpAgentSpec,
  run: ConversationBackendRun,
) => AcpAgentProcess;

/** Resolve the binary: explicit env override, else the spec's default off PATH. */
function resolveBin(spec: AcpAgentSpec, env: NodeJS.ProcessEnv): string {
  const override = env[spec.binEnv]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }

  return spec.defaultBin;
}

/**
 * Spawn the spec's CLI in ACP mode in the run's working directory.
 *
 * @public
 */
export function spawnAcpAgent(
  spec: AcpAgentSpec,
  run: ConversationBackendRun,
): AcpAgentProcess {
  const child = spawn(resolveBin(spec, process.env), [...spec.args], {
    cwd: run.cwd,
    detached: spec.processGroup,
    env: spec.env(process.env, run.mcpEnv),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (data: Buffer) => {
    stderr = `${stderr}${data.toString('utf8')}`.slice(-STDERR_TAIL_BYTES);
  });
  // A spawn failure (ENOENT) surfaces here and closes stdout, which closes the
  // ACP connection; the pending request then rejects with the reason below.
  child.on('error', (error: Error) => {
    stderr = `${stderr}\n${error.message}`.slice(-STDERR_TAIL_BYTES);
  });

  return {
    connect: (app: ClientApp): ClientConnection => {
      return app.connect(
        ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)),
      );
    },
    dispose: (): void => {
      terminateChild(child, resolveAgentTimeouts().graceMs, {
        processGroup: spec.processGroup,
      });
    },
    stderrTail: (): string => {
      return stderr.trim();
    },
  };
}
