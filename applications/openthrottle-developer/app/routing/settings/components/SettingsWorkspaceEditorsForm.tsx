import * as React from 'react';
import clsx from 'clsx';
import { Button, Label } from '@openthrottle/react-router-shadcn';
import { ComputerIcon } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { getWorkspaceEditorAffiliateUrl } from '~/routing/settings/config/workspace-editor-affiliate-links';
import { WorkspaceEditorCard } from '~/routing/settings/components/WorkspaceEditorCard';
import { WorkspaceEditorPresenceFootnote } from '~/routing/settings/components/WorkspaceEditorPresenceFootnote';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import { buildWorkspaceEditorPresenceMap } from '~/routing/settings/utils/workspace-editor-presence';
import {
  hasWorkspaceEditorSelectionChanged,
  toggleWorkspaceEditor,
} from '~/routing/settings/utils/workspace-editor-selection';
import type {
  GetEditorPresenceQuery,
  UserWorkspaceProfileFieldsFragment,
  WorkspaceEditorId,
} from '~/__generated__/graphql';

export interface SettingsWorkspaceEditorsFormProps {
  actionError?: string | null;
  className?: string;
  /**
   * Advisory editor-presence hints, or null when the probe query failed. Display-only —
   * it never feeds the submitted selection.
   */
  editorPresence?: GetEditorPresenceQuery['editorPresence'] | null;
  profile: UserWorkspaceProfileFieldsFragment;
}

/**
 * @description Chooses which editors OpenThrottle configures, one card per editor, so
 * enablement, detection, and acquisition sit together instead of in three stacked lists.
 * Posts the contact values alongside the selection so the shared `updateProfile` intent
 * never has to tolerate a partial payload.
 */
export const SettingsWorkspaceEditorsForm = (
  props: SettingsWorkspaceEditorsFormProps,
): React.ReactElement => {
  const { actionError, className, editorPresence, profile } = props;

  // Hooks
  const navigation = useNavigation();

  const [enabledEditors, setEnabledEditors] = React.useState<
    WorkspaceEditorId[]
  >([...profile.enabledEditors]);

  // Setup
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateProfile';

  const presenceByEditor = buildWorkspaceEditorPresenceMap(editorPresence);

  // Detection is deliberately absent from this: only a real change gates Save.
  const isDirty = hasWorkspaceEditorSelectionChanged(
    enabledEditors,
    profile.enabledEditors,
  );

  // Handlers
  const handleToggle = (editor: WorkspaceEditorId, next: boolean): void =>
    setEnabledEditors((current) =>
      toggleWorkspaceEditor(current, editor, next),
    );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setEnabledEditors([...profile.enabledEditors]);
  }, [profile.enabledEditors]);

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={ComputerIcon}
      id="settings-workspace-editors-form"
      legend={WORKSPACE_SETTINGS_COPY.editorsLegend}
    >
      <Form
        className={clsx('space-y-4', className)}
        data-testid="SettingsWorkspaceEditorsForm"
        method="post"
      >
        <input name="intent" type="hidden" value="updateProfile" />
        <input
          name="worktreeRoot"
          type="hidden"
          value={profile.worktreeRoot ?? ''}
        />
        <input
          name="contactDisplayName"
          type="hidden"
          value={profile.contactDisplayName ?? ''}
        />
        <input
          name="contactEmail"
          type="hidden"
          value={profile.contactEmail ?? ''}
        />
        {enabledEditors.map((editor) => (
          <input
            key={editor}
            name="enabledEditors"
            type="hidden"
            value={editor}
          />
        ))}

        <div className="space-y-3">
          <Label>{WORKSPACE_SETTINGS_COPY.editorsLabel}</Label>
          <p className="text-muted-foreground text-sm">
            {WORKSPACE_SETTINGS_COPY.editorsExplainer}
          </p>

          {/* Mapped over the catalog, not the probe: an editor the probe
              omitted still gets a card, just without a badge. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE_EDITOR_OPTIONS.map((option) => (
              <WorkspaceEditorCard
                affiliateUrl={getWorkspaceEditorAffiliateUrl(option.value)}
                editor={option.value}
                enabled={enabledEditors.includes(option.value)}
                key={option.value}
                onToggle={handleToggle}
                presence={presenceByEditor.get(option.value) ?? null}
              />
            ))}
          </div>

          <p className="text-muted-foreground text-xs">
            {WORKSPACE_SETTINGS_COPY.affiliateDisclosure}
          </p>

          <WorkspaceEditorPresenceFootnote
            scannedAt={editorPresence?.scannedAt}
            trusted={editorPresence?.trusted}
          />
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        <Button
          disabled={isSubmitting || !isDirty}
          title={
            isDirty ? undefined : WORKSPACE_SETTINGS_COPY.saveNoChangesLabel
          }
          type="submit"
          variant="outline"
        >
          {isSubmitting
            ? WORKSPACE_SETTINGS_COPY.saveBusyLabel
            : WORKSPACE_SETTINGS_COPY.saveEditorsButton}
        </Button>
      </Form>
    </OpenThrottleFieldset>
  );
};
