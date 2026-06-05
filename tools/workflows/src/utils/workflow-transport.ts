/**
 * @description Ralph OpenThrottle I/O transport selection (GraphQL default; postgres-direct rollback).
 * See `docs/workflows/graphql-only-transport-boundary.md`.
 */

/** Env var: `graphql` (default) or `postgres-direct` for rollback. */
export const WORKFLOW_RALPH_TRANSPORT_ENV = 'WORKFLOW_RALPH_TRANSPORT' as const;

export type WorkflowRalphTransport = 'graphql' | 'postgres-direct';

/**
 * @description Resolves transport from `WORKFLOW_RALPH_TRANSPORT`. Defaults to GraphQL.
 */
export const resolveWorkflowRalphTransportFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): WorkflowRalphTransport => {
  const raw = env[WORKFLOW_RALPH_TRANSPORT_ENV]?.trim().toLowerCase();

  if (raw === 'postgres-direct' || raw === 'postgres') {
    return 'postgres-direct';
  }

  return 'graphql';
};
