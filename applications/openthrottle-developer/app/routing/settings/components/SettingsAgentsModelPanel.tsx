import { Input } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SettingsAgentsModelBulkToggle } from '~/routing/settings/components/SettingsAgentsModelBulkToggle';
import { SettingsAgentsModelRow } from '~/routing/settings/components/SettingsAgentsModelRow';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/copy';
import { filterAgentModelOptions } from '~/routing/settings/utils/filterAgentModelOptions';
import {
  settingsAgentsModelsEnabledSummary,
  settingsAgentsModelsShownSummary,
} from '~/routing/settings/utils/settings-agents-copy';

export interface SettingsAgentsModelPanelProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** The expanded agent CLI row whose models this panel lists. */
  status: AgentCliStatus;
}

/**
 * @description The expanded per-model list of one agent: a client-side filter
 * on the model id, the enabled summary, and the bulk enable/disable controls,
 * which act on only the shown models while a filter is active. The filter is
 * local state, so collapsing the row (unmounting this panel) resets it.
 */
export const SettingsAgentsModelPanel = (
  props: SettingsAgentsModelPanelProps,
): React.ReactElement => {
  const { canManage, status } = props;
  const { driver, enabled, modelOptions, models } = status;

  // Hooks
  const [query, setQuery] = React.useState('');

  // Setup
  const filtered = query.trim() !== '';
  const shownOptions = filterAgentModelOptions(modelOptions, query);
  const shownModels = filtered
    ? shownOptions.map((option) => option.model)
    : models;
  const enabledCount = modelOptions.filter((option) => option.enabled).length;
  const shownEnabledCount = shownOptions.filter(
    (option) => option.enabled,
  ).length;
  const hasNoMatches = shownOptions.length === 0;

  // Handlers
  const handleQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setQuery(event.target.value);
  };

  // Markup
  const shownSummary = (
    <span
      className="text-muted-foreground text-xs whitespace-nowrap"
      data-testid={`SettingsAgentsModelPanel-${driver}-shown`}
    >
      {settingsAgentsModelsShownSummary(shownOptions.length, models.length)}
    </span>
  );
  const emptyMarkup = (
    <p
      className="text-muted-foreground py-3 text-center text-xs"
      data-testid={`SettingsAgentsModelPanel-${driver}-empty`}
    >
      {SETTINGS_AGENTS_COPY.modelFilterEmpty}
    </p>
  );
  const rowsMarkup = shownOptions.map((model) => (
    <SettingsAgentsModelRow
      agentDisabled={!enabled}
      canManage={canManage}
      driver={driver}
      key={model.model}
      model={model}
    />
  ));

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="bg-muted/30 rounded-md px-3 py-1"
      data-testid="SettingsAgentsModelPanel"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b py-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {settingsAgentsModelsEnabledSummary(enabledCount, models.length)}
          </span>
          {filtered ? shownSummary : null}
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label={SETTINGS_AGENTS_COPY.modelFilterLabel}
            className="h-7 w-48 text-xs"
            data-testid={`SettingsAgentsModelPanel-${driver}-filter`}
            onChange={handleQueryChange}
            placeholder={SETTINGS_AGENTS_COPY.modelFilterPlaceholder}
            type="search"
            value={query}
          />
          <SettingsAgentsModelBulkToggle
            agentDisabled={!enabled}
            canManage={canManage}
            driver={driver}
            enabledCount={shownEnabledCount}
            filtered={filtered}
            models={shownModels}
          />
        </div>
      </div>
      {hasNoMatches ? emptyMarkup : rowsMarkup}
    </div>
  );
};
