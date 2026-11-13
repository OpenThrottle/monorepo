/**
 * @description Injection token for the {@link AgentAccountResolver} the stamping service uses.
 * Production binds the real resolver (CLI probes + local files, cached); tests bind a stub.
 */
export const AGENT_ACCOUNT_RESOLVER = Symbol('AGENT_ACCOUNT_RESOLVER');
