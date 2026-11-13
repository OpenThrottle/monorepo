/**
 * Public surface of the ACP conversation backend: the flag, the per-agent
 * specs, and the backend factory (with its launcher seam for tests). The
 * update mapper, permission policy and MCP conversion stay module-private.
 */
export {
  ACP_IDLE_TTL_MS_ENV,
  ACP_MAX_LIVE_SESSIONS_ENV,
  type AcpConversationBackendOptions,
  createAcpConversationBackend,
} from './acp.ts';
export { ACP_AGENT_SPECS, type AcpAgentSpec } from './agent-specs.ts';
export {
  type AcpAgentProcess,
  type AcpLauncher,
  spawnAcpAgent,
} from './launcher.ts';
export { resolveAcpPermission } from './permissions.ts';
export {
  CHAT_ACP_BACKENDS_ENV,
  isAcpChatEnabled,
  withAcpRouting,
} from './routing.ts';
