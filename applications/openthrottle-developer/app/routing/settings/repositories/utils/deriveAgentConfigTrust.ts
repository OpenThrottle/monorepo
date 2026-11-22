import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';

/**
 * @description What the repository detail's trust card shows: the OpenThrottle repository is
 * always trusted; any other repository is trusted only when the user trusted it, with the counts
 * of hooks and MCP servers its checkouts define (null until a checkout has been scanned).
 */
export type AgentConfigTrustView =
  | {
      readonly hookCount: number | null;
      readonly kind: 'foreign';
      readonly mcpServerCount: number | null;
      readonly trusted: boolean;
    }
  | { readonly kind: 'openthrottle' };

/**
 * @description Rolls a repository's checkouts up into its trust view. Trust is flipped for every
 * checkout together, so the repository counts as trusted only when every foreign checkout is; the
 * counts come from the first foreign checkout whose inspection reports them.
 */
export const deriveAgentConfigTrust = (
  checkouts: readonly RepositoryCheckoutFieldsFragment[],
): AgentConfigTrustView => {
  const foreign = checkouts.filter((checkout) => checkout.isForeign);
  if (foreign.length === 0) {
    return { kind: 'openthrottle' };
  }

  const scanned = foreign.find((checkout) => {
    return checkout.inspection?.agentConfig.hookCount != null;
  });
  const agentConfig = scanned?.inspection?.agentConfig;

  return {
    hookCount: agentConfig?.hookCount ?? null,
    kind: 'foreign',
    mcpServerCount: agentConfig?.mcpServerCount ?? null,
    trusted: foreign.every((checkout) => checkout.agentConfigTrusted),
  };
};
