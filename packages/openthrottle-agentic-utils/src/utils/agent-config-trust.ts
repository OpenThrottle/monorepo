/**
 * @description Decides whether a plan run may load the checkout's own repo-local agent config
 * (`.claude/settings.json` hooks, `.mcp.json` servers and their equivalents). The stored flag is
 * `repository_checkouts.agent_config_trusted`; the OpenThrottle install's own checkout is always
 * trusted, whatever the flag says. See docs/monorepo/agent-config-trust.md.
 */

import type { ForeignWorkspaceContext } from './foreign-workspace-context.ts';

/**
 * @description How a run treats the checkout's repo-local agent config: `trusted` loads it as the
 * CLI would by default; `isolated` spawns the agent so only OpenThrottle-supplied MCP servers and
 * plugin hooks load.
 * @public
 */
export const AGENT_CONFIG_POSTURE = {
  ISOLATED: 'isolated',
  TRUSTED: 'trusted',
} as const;

/** @public */
export type AgentConfigPosture =
  (typeof AGENT_CONFIG_POSTURE)[keyof typeof AGENT_CONFIG_POSTURE];

/**
 * @description Why a run got its posture, so plan output can say it in words.
 * @public
 */
export const AGENT_CONFIG_TRUST_REASON = {
  OPENTHROTTLE_CHECKOUT: 'openthrottle-checkout',
  UNREGISTERED: 'unregistered',
  UNTRUSTED: 'untrusted',
  USER_TRUSTED: 'user-trusted',
} as const;

/** @public */
export type AgentConfigTrustReason =
  (typeof AGENT_CONFIG_TRUST_REASON)[keyof typeof AGENT_CONFIG_TRUST_REASON];

/** @public */
export interface AgentConfigTrust {
  readonly posture: AgentConfigPosture;
  readonly reason: AgentConfigTrustReason;
}

/**
 * @description The checkout fields trust depends on.
 * @public
 */
export interface AgentConfigTrustCheckout {
  readonly agentConfigTrusted: boolean;
  readonly filesystemPath: string;
}

/**
 * @description True when a resolved workspace context is the OpenThrottle install itself (or a
 * worktree of it). Fails closed: when the OpenThrottle root is unresolved, nothing counts as
 * OpenThrottle's own.
 * @public
 */
export const isOpenThrottleCheckout = (
  context: Pick<ForeignWorkspaceContext, 'isForeign' | 'openThrottleRoot'>,
): boolean => {
  return context.openThrottleRoot !== undefined && !context.isForeign;
};

/** @public */
export interface ResolveAgentConfigTrustInput {
  /** The acting user's row for the base checkout; null when the directory is not registered. */
  readonly checkout: AgentConfigTrustCheckout | null;
  /** From {@link isOpenThrottleCheckout} on the base checkout's workspace context. */
  readonly isOpenThrottleCheckout: boolean;
}

/**
 * @description Resolves a run's agent-config posture for its base checkout (never the provisioned
 * worktree, which inherits its parent's trust). The OpenThrottle checkout is always trusted; any
 * other directory needs the user's explicit trust, and an unregistered one has none.
 * @public
 */
export const resolveAgentConfigTrust = (
  input: ResolveAgentConfigTrustInput,
): AgentConfigTrust => {
  const { checkout } = input;
  if (input.isOpenThrottleCheckout) {
    return {
      posture: AGENT_CONFIG_POSTURE.TRUSTED,
      reason: AGENT_CONFIG_TRUST_REASON.OPENTHROTTLE_CHECKOUT,
    };
  }

  if (checkout === null) {
    return {
      posture: AGENT_CONFIG_POSTURE.ISOLATED,
      reason: AGENT_CONFIG_TRUST_REASON.UNREGISTERED,
    };
  }

  if (checkout.agentConfigTrusted) {
    return {
      posture: AGENT_CONFIG_POSTURE.TRUSTED,
      reason: AGENT_CONFIG_TRUST_REASON.USER_TRUSTED,
    };
  }

  return {
    posture: AGENT_CONFIG_POSTURE.ISOLATED,
    reason: AGENT_CONFIG_TRUST_REASON.UNTRUSTED,
  };
};
