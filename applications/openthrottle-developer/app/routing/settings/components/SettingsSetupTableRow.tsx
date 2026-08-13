import * as React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { Badge, TableCell, TableRow } from '@openthrottle/react-router-shadcn';
import {
  SETTINGS_SETUP_COPY,
  settingsSetupModelsEnabledSummary,
  settingsSetupModelsSummary,
} from '~/routing/settings/data/data.copy';
import { SettingsSetupAgentToggle } from '~/routing/settings/components/SettingsSetupAgentToggle';
import { SettingsSetupCliControls } from '~/routing/settings/components/SettingsSetupCliControls';
import { SettingsSetupModelRow } from '~/routing/settings/components/SettingsSetupModelRow';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

/** Column count of the setup table — the expansion row spans all of it. */
const SETTINGS_SETUP_COLUMN_COUNT = 5;

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
  const [expanded, setExpanded] = React.useState(false);

  // Setup
  const { backend, enabled, installed, label, modelOptions, models, version } =
    status;
  const hasModels = installed && modelOptions.length > 0;
  const enabledCount = modelOptions.filter((model) => model.enabled).length;

  // Handlers
  const handleToggleExpanded = (): void => setExpanded((prev) => !prev);

  // Markup
  const modelsCell = !installed ? (
    <span className="text-muted-foreground">
      {SETTINGS_SETUP_COPY.modelsNotInstalled}
    </span>
  ) : modelOptions.length === 0 ? (
    <span className="text-muted-foreground text-sm">
      {SETTINGS_SETUP_COPY.modelsEmpty}
    </span>
  ) : (
    // Compact: a count that expands an inline per-model control list (enable +
    // favorite), never an unbounded badge cloud that stretches the row.
    <button
      aria-expanded={expanded}
      className="flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
      data-testid={`SettingsSetupTableRow-${backend}-expand`}
      onClick={handleToggleExpanded}
      type="button"
    >
      {expanded ? (
        <ChevronDownIcon className="size-4" />
      ) : (
        <ChevronRightIcon className="size-4" />
      )}
      {settingsSetupModelsSummary(models.length)}
      <span className="text-muted-foreground text-xs">
        ({settingsSetupModelsEnabledSummary(enabledCount, models.length)})
      </span>
    </button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
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

      {hasModels && expanded ? (
        <TableRow
          className={enabled ? undefined : 'opacity-60'}
          data-testid={`SettingsSetupTableRow-${backend}-models`}
        >
          <TableCell colSpan={SETTINGS_SETUP_COLUMN_COUNT}>
            <div className="bg-muted/30 rounded-md px-3 py-1">
              {modelOptions.map((model) => (
                <SettingsSetupModelRow
                  agentDisabled={!enabled}
                  backend={backend}
                  canManage={canManage}
                  key={model.model}
                  model={model}
                />
              ))}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};
