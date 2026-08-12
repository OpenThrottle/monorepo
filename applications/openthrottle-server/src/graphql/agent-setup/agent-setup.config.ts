/**
 * @description Feature-flag policy for server-side agent-CLI install/update. Running the
 * registry-defined `curl | shell` installers on the server host is remote-code-execution-on-demand,
 * so it is DEFAULT-OFF: hosted/multi-tenant deployments must never enable it. This is a
 * local-developer-machine feature, opted in via `OT_AGENT_CLI_INSTALL_ENABLED`.
 */

import type { ConfigService } from '@nestjs/config';

/** Env var gating server-side install/update. Default-off; enabled only for true/1/yes. */
export const AGENT_CLI_INSTALL_ENABLED_ENV = 'OT_AGENT_CLI_INSTALL_ENABLED';

/**
 * @description True only when `OT_AGENT_CLI_INSTALL_ENABLED` is explicitly opted in
 * (`true` | `1` | `yes`). Absent/unrecognized ⇒ false (mirrors
 * readAgentsChatMutationsEnabledFromConfig).
 */
export const readAgentCliInstallEnabledFromConfig = (
  config: ConfigService,
): boolean => {
  const value = config
    .get<string>(AGENT_CLI_INSTALL_ENABLED_ENV)
    ?.trim()
    .toLowerCase();

  return value === 'true' || value === '1' || value === 'yes';
};
