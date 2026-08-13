import * as React from 'react';
import {
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TableCell,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import {
  SETTINGS_SETUP_COPY,
  settingsSetupModelsSummary,
} from '~/routing/settings/data/data.copy';
import { SettingsSetupAgentToggle } from '~/routing/settings/components/SettingsSetupAgentToggle';
import { SettingsSetupCliControls } from '~/routing/settings/components/SettingsSetupCliControls';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

export interface SettingsSetupTableRowProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  status: AgentCliStatus;
}

export const SettingsSetupTableRow = (
  props: SettingsSetupTableRowProps,
): React.ReactElement => {
  const { canManage, installEnabled, status } = props;

  // Hooks

  // Setup
  const { backend, enabled, installed, label, models, version } = status;

  // Handlers

  // Markup
  const modelsCell = !installed ? (
    <span className="text-muted-foreground">
      {SETTINGS_SETUP_COPY.modelsNotInstalled}
    </span>
  ) : models.length === 0 ? (
    <span className="text-muted-foreground text-sm">
      {SETTINGS_SETUP_COPY.modelsEmpty}
    </span>
  ) : (
    // Compact: a count that expands the full list in a popover, never an
    // unbounded badge cloud that stretches the row.
    <Popover>
      <PopoverTrigger className="text-sm underline-offset-4 hover:underline">
        {settingsSetupModelsSummary(models.length)}
      </PopoverTrigger>
      <PopoverContent className="max-h-64 w-64 overflow-auto">
        <p className="text-muted-foreground mb-2 text-xs font-medium">
          {SETTINGS_SETUP_COPY.modelsPopoverTitle}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {models.map((model) => (
            <Badge key={model} variant="outline">
              {model}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow
      // A disabled agent is dimmed but still fully actionable (re-enable, install).
      className={enabled ? undefined : 'opacity-60'}
      data-testid={`SettingsSetupTableRow-${backend}`}
    >
      <TableCell>
        <div className="font-medium">{label}</div>
        <code className="text-muted-foreground text-xs">{backend}</code>
      </TableCell>

      <TableCell>
        {installed ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {SETTINGS_SETUP_COPY.installedBadge}
            </Badge>
            {version != null ? (
              <span className="text-muted-foreground text-xs">{version}</span>
            ) : null}
          </div>
        ) : (
          <Badge variant="outline">
            {SETTINGS_SETUP_COPY.notInstalledBadge}
          </Badge>
        )}
      </TableCell>

      <TableCell>{modelsCell}</TableCell>

      <TableCell>
        <SettingsSetupAgentToggle
          backend={backend}
          canManage={canManage}
          enabled={enabled}
        />
      </TableCell>

      <TableCell>
        <SettingsSetupCliControls
          canManage={canManage}
          installEnabled={installEnabled}
          status={status}
        />
      </TableCell>
    </TableRow>
  );
};
