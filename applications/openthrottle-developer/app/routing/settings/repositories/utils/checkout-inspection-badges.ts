import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';

/** The inspection payload carried by a repository checkout, or null. */
type CheckoutInspection = RepositoryCheckoutFieldsFragment['inspection'];

export interface CheckoutInspectionBadges {
  detectedAgentConfig: string[];
  detectedStack: string[];
}

/**
 * @description Derive the Stack and Agent-config badge labels from a checkout's
 * inspection. Presentation-free and null-safe: returns empty arrays when the
 * checkout has not been inspected. Shared by `AddFolderResult` and
 * `RepositoryDetail` so both surfaces show identical badges.
 */
export const deriveCheckoutInspectionBadges = (
  inspection: CheckoutInspection,
): CheckoutInspectionBadges => {
  if (inspection == null) {
    return { detectedAgentConfig: [], detectedStack: [] };
  }

  const detectedStack = [
    inspection.stack.nxWorkspace ? 'Nx' : null,
    inspection.stack.pnpmWorkspace ? 'pnpm workspace' : null,
    inspection.stack.turbo ? 'Turbo' : null,
    inspection.stack.packageManager,
    ...inspection.stack.languages,
  ].filter((value): value is string => value != null);

  const detectedAgentConfig = [
    inspection.agentConfig.mcpJson ? '.mcp.json' : null,
    inspection.agentConfig.claudeMd ? 'CLAUDE.md' : null,
    inspection.agentConfig.agentsMd ? 'AGENTS.md' : null,
    inspection.agentConfig.cursorRules ? '.cursor/rules' : null,
    inspection.agentConfig.skillsDir ? 'skills' : null,
  ].filter((value): value is string => value != null);

  return { detectedAgentConfig, detectedStack };
};
