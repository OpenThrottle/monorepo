import * as React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { Badge, TableCell, TableRow } from '@openthrottle/react-router-shadcn';
import {
  SETTINGS_AGENTS_COPY,
  settingsAgentsModelsEnabledSummary,
  settingsAgentsModelsSummary,
} from '~/routing/settings/data/data.copy';
import { SettingsAgentsAgentToggle } from '~/routing/settings/components/SettingsAgentsAgentToggle';
import { SettingsAgentsCliControls } from '~/routing/settings/components/SettingsAgentsCliControls';
import { SettingsAgentsModelBulkToggle } from '~/routing/settings/components/SettingsAgentsModelBulkToggle';
import { SettingsAgentsModelRow } from '~/routing/settings/components/SettingsAgentsModelRow';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

/** Column count of the setup table — the expansion row spans all of it. */
const SETTINGS_AGENTS_COLUMN_COUNT = 5;

export interface SettingsAgentsTableRowProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  status: AgentCliStatus;
}

export const SettingsAgentsTableRow = (
  props: SettingsAgentsTableRowProps,
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
      {SETTINGS_AGENTS_COPY.modelsNotInstalled}
    </span>
  ) : modelOptions.length === 0 ? (
    <span className="text-muted-foreground text-sm">
      {SETTINGS_AGENTS_COPY.modelsEmpty}
    </span>
  ) : (
    // Compact: a count that expands an inline per-model control list (enable +
    // favorite), never an unbounded badge cloud that stretches the row.
    <button
      aria-expanded={expanded}
      className="flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
      data-testid={`SettingsAgentsTableRow-${backend}-expand`}
      onClick={handleToggleExpanded}
      type="button"
    >
      {expanded ? (
        <ChevronDownIcon className="size-4" />
      ) : (
        <ChevronRightIcon className="size-4" />
      )}
      {settingsAgentsModelsSummary(models.length)}
      <span className="text-muted-foreground text-xs">
        ({settingsAgentsModelsEnabledSummary(enabledCount, models.length)})
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
        data-testid={`SettingsAgentsTableRow-${backend}`}
      >
        <TableCell>
          <div className="font-medium">{label}</div>
          <code className="text-muted-foreground text-xs">{backend}</code>
        </TableCell>

        <TableCell>
          {installed ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {SETTINGS_AGENTS_COPY.installedBadge}
              </Badge>
              {version != null ? (
                <span className="text-muted-foreground text-xs">{version}</span>
              ) : null}
            </div>
          ) : (
            <Badge variant="outline">
              {SETTINGS_AGENTS_COPY.notInstalledBadge}
            </Badge>
          )}
        </TableCell>

        <TableCell>{modelsCell}</TableCell>

        <TableCell>
          <SettingsAgentsAgentToggle
            backend={backend}
            canManage={canManage}
            enabled={enabled}
          />
        </TableCell>

        <TableCell>
          <SettingsAgentsCliControls
            canManage={canManage}
            installEnabled={installEnabled}
            status={status}
          />
        </TableCell>
      </TableRow>

      {hasModels && expanded ? (
        <TableRow
          className={enabled ? undefined : 'opacity-60'}
          data-testid={`SettingsAgentsTableRow-${backend}-models`}
        >
          <TableCell colSpan={SETTINGS_AGENTS_COLUMN_COUNT}>
            <div className="bg-muted/30 rounded-md px-3 py-1">
              <div className="flex items-center justify-between gap-3 border-b py-1">
                <span className="text-muted-foreground text-xs">
                  {settingsAgentsModelsEnabledSummary(
                    enabledCount,
                    models.length,
                  )}
                </span>
                <SettingsAgentsModelBulkToggle
                  agentDisabled={!enabled}
                  backend={backend}
                  canManage={canManage}
                  enabledCount={enabledCount}
                  models={models}
                />
              </div>
              {modelOptions.map((model) => (
                <SettingsAgentsModelRow
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
