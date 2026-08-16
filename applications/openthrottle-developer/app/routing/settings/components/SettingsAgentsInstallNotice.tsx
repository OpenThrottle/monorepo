import * as React from 'react';
import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsAgentsInstallNoticeProps {
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
}

/**
 * The single, route-level explanation of the OT_AGENT_CLI_INSTALL_ENABLED env flag. Rendered exactly
 * once (in the toolbar) instead of repeated inside every row's controls: a warning when install is
 * off (the Install/Update buttons are disabled), an informational note when it is on.
 */
export const SettingsAgentsInstallNotice = (
  props: SettingsAgentsInstallNoticeProps,
): React.ReactElement => {
  const { installEnabled } = props;

  // Hooks

  // Setup
  const Icon = installEnabled ? InfoIcon : TriangleAlertIcon;
  const message = installEnabled
    ? SETTINGS_AGENTS_COPY.installDisclaimerOn
    : SETTINGS_AGENTS_COPY.installDisclaimerOff;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground flex items-start gap-2 text-xs"
      data-testid="SettingsAgentsInstallNotice"
    >
      <Icon aria-hidden={true} className="mt-0.5 size-3.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
};
