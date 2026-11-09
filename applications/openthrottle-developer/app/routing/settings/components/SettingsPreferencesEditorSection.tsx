import {
  Alert,
  AlertDescription,
  Button,
  cn,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { SquareCodeIcon, TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import {
  WORKSPACE_EDITOR_LABELS,
  WORKSPACE_EDITOR_OPTIONS,
} from '~/routing/settings/config/workspace-editors';
import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';
import type { PreferencesActionResult } from '~/routing/settings/data/data.preferences';
import {
  PREFERENCES_INTENTS,
  SYSTEM_DEFAULT_EDITOR_VALUE,
} from '~/routing/settings/data/data.preferences';
import {
  isDefaultEditorEnabled,
  toPreferencesFeedback,
} from '~/routing/settings/utils/user-preferences';

export interface SettingsPreferencesEditorSectionProps {
  readonly className?: string;
  /** The stored default editor, or null for the system default (VS Code). */
  readonly defaultEditor: WorkspaceEditorId | null;
  /**
   * The editors enabled on Settings → Workspace; drives the not-enabled warning.
   * `null` when they could not be loaded, which suppresses the warning.
   */
  readonly enabledEditors: readonly WorkspaceEditorId[] | null;
}

/**
 * @description The Default editor section of Settings → Preferences. Picking an
 * editor the user has not enabled is allowed but warned about, with a link to
 * Workspace; it is never enabled on their behalf (D5).
 */
export const SettingsPreferencesEditorSection = (
  props: SettingsPreferencesEditorSectionProps,
): React.ReactElement => {
  const { className, defaultEditor, enabledEditors } = props;

  // Hooks
  const fetcher = useFetcher<PreferencesActionResult>();
  const [editor, setEditor] = React.useState<WorkspaceEditorId | null>(
    defaultEditor,
  );

  // Setup
  const copy = SETTINGS_PREFERENCES_COPY;
  const isSubmitting = fetcher.state !== 'idle';
  const { error, saved } = toPreferencesFeedback(fetcher.data);
  const showSaved = error === null && saved && !isSubmitting;
  const isEnabled = isDefaultEditorEnabled(editor, enabledEditors);
  const selectValue = editor ?? SYSTEM_DEFAULT_EDITOR_VALUE;

  // Handlers
  const handleValueChange = (value: string): void => {
    const option = WORKSPACE_EDITOR_OPTIONS.find(
      (candidate) => candidate.value === value,
    );
    setEditor(option?.value ?? null);
  };

  // Markup
  const notEnabledNotice = editor !== null && (
    <Alert data-testid="SettingsPreferencesEditorSection-not-enabled">
      <TriangleAlertIcon aria-hidden={true} />
      <AlertDescription>
        <p>
          {WORKSPACE_EDITOR_LABELS[editor]} {copy.editorNotEnabledNotice}{' '}
          <Link
            className="underline underline-offset-4"
            to="/settings/workspace"
          >
            {copy.editorNotEnabledLink}
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  );

  const errorMarkup = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );

  const savedMarkup = (
    <p className="text-muted-foreground text-sm" role="status">
      {copy.editorSavedNotice}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={SquareCodeIcon}
      id="settings-preferences-editor"
      legend={copy.editorLegend}
    >
      <fetcher.Form
        className={cn('space-y-4', className)}
        data-testid="SettingsPreferencesEditorSection"
        method="post"
      >
        <p className="text-muted-foreground text-sm">{copy.editorExplainer}</p>

        <div className="space-y-2">
          <Label htmlFor="settings-preferences-default-editor">
            {copy.editorLabel}
          </Label>
          <Select onValueChange={handleValueChange} value={selectValue}>
            <SelectTrigger
              aria-label={copy.editorLabel}
              className="w-full sm:w-72"
              id="settings-preferences-default-editor"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SYSTEM_DEFAULT_EDITOR_VALUE}>
                {copy.editorSystemDefaultOption}
              </SelectItem>
              {WORKSPACE_EDITOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Blank posts as an explicit clear: the system default. */}
          <input name="defaultEditor" type="hidden" value={editor ?? ''} />
        </div>

        {isEnabled ? null : notEnabledNotice}
        {error === null ? null : errorMarkup}
        {showSaved ? savedMarkup : null}

        <Button
          disabled={isSubmitting}
          name="intent"
          type="submit"
          value={PREFERENCES_INTENTS.saveDefaultEditor}
          variant="outline"
        >
          {isSubmitting ? copy.saveBusyLabel : copy.editorSaveButton}
        </Button>
      </fetcher.Form>
    </OpenThrottleFieldset>
  );
};
