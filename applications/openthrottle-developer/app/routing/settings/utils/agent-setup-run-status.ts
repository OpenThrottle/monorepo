import type {
  AgentSetupMode,
  AgentSetupRunStatus,
} from '~/routing/settings/data/agent-clis';

/** The slice of a streamed setup chunk needed to resolve a run's status. */
export interface AgentSetupRunChunk {
  readonly done: boolean;
  readonly exitCode?: number | null;
}

/** The slice of `useAgentSetupStream`'s result needed to resolve a run's status. */
export interface AgentSetupRunStreamState {
  readonly chunks: readonly AgentSetupRunChunk[];
  readonly done: boolean;
  readonly error: string | null;
}

/**
 * @description Lifecycle of one setup run from its stream: running until the
 * terminal chunk arrives, then failed when it carries an error (with the exit
 * code when the process exited), otherwise succeeded.
 */
export const getAgentSetupRunStatus = (
  stream: AgentSetupRunStreamState,
): AgentSetupRunStatus => {
  if (!stream.done) {
    return { kind: 'running' };
  }
  if (stream.error == null) {
    return { kind: 'succeeded' };
  }
  const terminal = stream.chunks.find((chunk) => chunk.done);
  return {
    error: stream.error,
    exitCode: terminal?.exitCode ?? null,
    kind: 'failed',
  };
};

/**
 * @description The mode a run was started in. Prefers the server's echo of
 * the run's mode, so a finished install keeps its "Installing" title after
 * the loader revalidates the CLI to installed; falls back to the row intent.
 */
export const getAgentSetupRunMode = (
  serverMode: string | undefined,
  fallback: AgentSetupMode,
): AgentSetupMode => {
  if (serverMode === 'install' || serverMode === 'update') {
    return serverMode;
  }
  return fallback;
};
