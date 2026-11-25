import * as React from 'react';

import { SettingsAgentsModelFavorite } from '~/routing/settings/components/SettingsAgentsModelFavorite';
import { SettingsAgentsModelToggle } from '~/routing/settings/components/SettingsAgentsModelToggle';
import type { AgentCliModelStatus } from '~/routing/settings/data/agent-clis';

export interface SettingsAgentsModelRowProps {
  /** True when the parent agent is disabled (agent-OFF hard-overrides its models). */
  agentDisabled: boolean;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Driver id this model belongs to. */
  driver: string;
  /** Per-model enabled + favorite state. */
  model: AgentCliModelStatus;
}

export const SettingsAgentsModelRow = (
  props: SettingsAgentsModelRowProps,
): React.ReactElement => {
  const { agentDisabled, driver, canManage, model } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors"
      data-testid={`SettingsAgentsModelRow-${driver}-${model.model}`}
    >
      <code
        className={
          model.enabled && !agentDisabled
            ? 'text-xs'
            : 'text-muted-foreground text-xs'
        }
      >
        {model.model}
      </code>
      <div className="flex items-center gap-2">
        <SettingsAgentsModelFavorite
          canManage={canManage}
          driver={driver}
          favorite={model.favorite}
          model={model.model}
        />
        <SettingsAgentsModelToggle
          agentDisabled={agentDisabled}
          canManage={canManage}
          driver={driver}
          enabled={model.enabled}
          model={model.model}
        />
      </div>
    </div>
  );
};
