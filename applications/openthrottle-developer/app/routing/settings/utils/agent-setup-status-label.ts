import type {
  AgentSetupMode,
  AgentSetupRunStatus,
} from '~/routing/settings/data/data.agent-clis';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';

/**
 * @description Dialog title for a setup run, e.g. "Updating OpenCode".
 */
export const getAgentSetupTitle = (
  mode: AgentSetupMode,
  agentName: string,
): string => {
  const { setupLogTitleInstallPrefix, setupLogTitleUpdatePrefix } =
    SETTINGS_AGENTS_COPY;
  if (mode === 'install') {
    return `${setupLogTitleInstallPrefix} ${agentName}`;
  }
  return `${setupLogTitleUpdatePrefix} ${agentName}`;
};

/**
 * @description One-line status for a setup run. A failure carries its exit
 * code and error message when known, e.g. "Failed (exit code 1): boom".
 */
export const getAgentSetupStatusLabel = (
  status: AgentSetupRunStatus,
): string => {
  if (status.kind === 'running') {
    return SETTINGS_AGENTS_COPY.setupLogRunning;
  }
  if (status.kind === 'succeeded') {
    return SETTINGS_AGENTS_COPY.setupLogSucceeded;
  }

  const { setupLogExitCodeLabel, setupLogFailed } = SETTINGS_AGENTS_COPY;
  const parts: string[] = [setupLogFailed];
  if (status.exitCode != null) {
    parts.push(` (${setupLogExitCodeLabel} ${status.exitCode})`);
  }
  if (status.error != null) {
    parts.push(`: ${status.error}`);
  }
  return parts.join('');
};
