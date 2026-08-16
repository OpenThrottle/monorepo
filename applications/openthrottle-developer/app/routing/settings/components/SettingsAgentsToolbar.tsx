import * as React from 'react';
import { Button, ButtonGroup } from '@openthrottle/react-router-shadcn';
import {
  AGENT_CLI_FILTERS,
  type AgentCliFilter,
} from '~/routing/settings/data/agent-clis.data';
import {
  SETTINGS_AGENTS_COPY,
  SETTINGS_AGENTS_FILTER_LABELS,
} from '~/routing/settings/data/data.copy';
// import { SettingsAgentsInstallNotice } from '~/routing/settings/components/SettingsAgentsInstallNotice';

export interface SettingsAgentsToolbarProps {
  /** Active table filter. */
  filter: AgentCliFilter;
  /** Server-computed: OT_AGENT_CLI_INSTALL_ENABLED is on. */
  installEnabled: boolean;
  /** Change the active filter. */
  onFilterChange: (filter: AgentCliFilter) => void;
}

export const SettingsAgentsToolbar = (
  props: SettingsAgentsToolbarProps,
): React.ReactElement => {
  const { filter, onFilterChange } = props;
  // const { filter, installEnabled, onFilterChange } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="SettingsAgentsToolbar"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {SETTINGS_AGENTS_COPY.filterLabel}
        </span>
        <ButtonGroup aria-label={SETTINGS_AGENTS_COPY.filterLabel}>
          {AGENT_CLI_FILTERS.map((value) => (
            <Button
              aria-pressed={filter === value}
              key={value}
              onClick={() => onFilterChange(value)}
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
            >
              {SETTINGS_AGENTS_FILTER_LABELS[value]}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      {/* <SettingsAgentsInstallNotice installEnabled={installEnabled} /> */}
    </div>
  );
};
