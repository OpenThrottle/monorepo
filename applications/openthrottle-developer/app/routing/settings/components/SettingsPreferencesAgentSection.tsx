import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { ChatModelPicker } from '@openthrottle/react-router-chat';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  cn,
  Label,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { BotIcon, TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';

import type { UserPreferencesFieldsFragment } from '~/__generated__/graphql';
import { PlanRunEffortControl } from '~/routing/plans/components/PlanRunEffortControl';
import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';
import { PREFERENCES_INTENTS } from '~/routing/settings/data/data.preferences';
import { useSettingsPreferencesAgentForm } from '~/routing/settings/hooks/useSettingsPreferencesAgentForm';
import { toPreferencesFeedback } from '~/routing/settings/utils/user-preferences';

export interface SettingsPreferencesAgentSectionProps {
  readonly className?: string;
  /** The stored default agent, or null for the system default. */
  readonly defaultAgent: UserPreferencesFieldsFragment['defaultAgent'];
  /** Discovered agent options; disabled agents and models are already excluded. */
  readonly models: readonly ChatModelOption[];
}

/**
 * @description The Default agent section of Settings → Preferences: pick an agent
 * and model with the shared chat model picker, set effort where the backend has
 * a separate knob, save, or fall back to the system default. A stored default
 * that can no longer run is named as unavailable rather than hidden.
 */
export const SettingsPreferencesAgentSection = (
  props: SettingsPreferencesAgentSectionProps,
): React.ReactElement => {
  const { className, defaultAgent, models } = props;

  // Hooks
  const {
    draft,
    effortSupported,
    fetcher,
    groups,
    isSubmitting,
    onEffortChange,
    onModelChange,
    resolved,
    runnableModels,
    selectedOptionId,
  } = useSettingsPreferencesAgentForm({ defaultAgent, models });

  // Setup
  const copy = SETTINGS_PREFERENCES_COPY;
  const { error, saved } = toPreferencesFeedback(fetcher.data);
  const canClear = resolved.kind !== 'none' || draft !== null;
  const isSystemDefault = draft === null && resolved.kind === 'none';
  const showSaved = error === null && saved && !isSubmitting;

  // Handlers

  // Markup
  const staleNotice = resolved.kind === 'stale' && (
    <Alert data-testid="SettingsPreferencesAgentSection-stale">
      <TriangleAlertIcon aria-hidden={true} />
      <AlertTitle>{copy.agentStaleTitle}</AlertTitle>
      <AlertDescription>
        <span className="font-mono">
          {resolved.stored.backend} · {resolved.stored.model}
        </span>{' '}
        {copy.agentStaleNotice}
      </AlertDescription>
    </Alert>
  );

  const picker = (
    <div>
      <ChatModelPicker
        groups={groups}
        models={runnableModels}
        onModelChange={onModelChange}
        placeholder={copy.agentModelPlaceholder}
        selectedModelId={selectedOptionId}
      />
    </div>
  );

  const noModelsNotice = (
    <p
      className="text-muted-foreground text-sm"
      data-testid="SettingsPreferencesAgentSection-empty"
    >
      {copy.agentNoModelsNotice}
    </p>
  );

  // Effort only for a backend with a separate knob; cursor folds it into the model id.
  const effortField = draft !== null && effortSupported && (
    <div
      className="space-y-2"
      data-testid="SettingsPreferencesAgentSection-effort"
    >
      <Label>{copy.agentEffortLabel}</Label>
      <div>
        <PlanRunEffortControl
          backend={draft.backend}
          effort={draft.effort}
          onEffortChange={onEffortChange}
        />
      </div>
      <p className="text-muted-foreground text-xs">{copy.agentEffortHint}</p>
    </div>
  );

  const draftFields = draft !== null && (
    <>
      <input name="backend" type="hidden" value={draft.backend} />
      <input name="model" type="hidden" value={draft.model} />
      <input name="effort" type="hidden" value={draft.effort} />
    </>
  );

  const systemDefaultNotice = (
    <p className="text-muted-foreground text-xs">
      {copy.agentSystemDefaultNotice}
    </p>
  );

  const errorMarkup = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );

  const savedMarkup = (
    <p className="text-muted-foreground text-sm" role="status">
      {copy.agentSavedNotice}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={BotIcon}
      id="settings-preferences-agent"
      legend={copy.agentLegend}
    >
      <fetcher.Form
        className={cn('space-y-4', className)}
        data-testid="SettingsPreferencesAgentSection"
        method="post"
      >
        <p className="text-muted-foreground text-sm">{copy.agentExplainer}</p>

        {staleNotice}

        <div className="space-y-2">
          <Label>{copy.agentModelLabel}</Label>
          {runnableModels.length > 0 ? picker : noModelsNotice}
          {isSystemDefault ? systemDefaultNotice : null}
        </div>

        {effortField}
        {draftFields}
        {error === null ? null : errorMarkup}
        {showSaved ? savedMarkup : null}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={draft === null || isSubmitting}
            name="intent"
            type="submit"
            value={PREFERENCES_INTENTS.saveDefaultAgent}
            variant="outline"
          >
            {isSubmitting ? copy.saveBusyLabel : copy.agentSaveButton}
          </Button>
          <Button
            disabled={!canClear || isSubmitting}
            name="intent"
            type="submit"
            value={PREFERENCES_INTENTS.clearDefaultAgent}
            variant="ghost"
          >
            {copy.agentClearButton}
          </Button>
        </div>
      </fetcher.Form>
    </OpenThrottleFieldset>
  );
};
