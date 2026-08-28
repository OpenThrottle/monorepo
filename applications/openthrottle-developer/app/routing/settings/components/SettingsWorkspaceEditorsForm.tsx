import * as React from 'react';
import clsx from 'clsx';
import { Button, Label } from '@openthrottle/react-router-shadcn';
import { ComputerIcon } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { WorkspaceEditorAffiliateLinks } from '~/routing/settings/components/WorkspaceEditorAffiliateLinks';
import { WorkspaceEditorMultiSelect } from '~/routing/settings/components/WorkspaceEditorMultiSelect';
import { WorkspaceEditorPresenceHints } from '~/routing/settings/components/WorkspaceEditorPresenceHints';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type {
  EditorPresenceState,
  GetEditorPresenceQuery,
  UserWorkspaceProfileFieldsFragment,
  WorkspaceEditorId as WorkspaceEditorIdType,
} from '~/__generated__/graphql';

export interface SettingsWorkspaceEditorsFormProps {
  actionError?: string | null;
  className?: string;
  /**
   * Advisory editor-presence hints, or null when the probe query failed. Display-only —
   * it never feeds the submitted selection.
   */
  editorPresence?: GetEditorPresenceQuery['editorPresence'] | null;
  /**
   * Presence indexed by editor, built once by the route. Display-only — it never feeds
   * the submitted selection and never gates a control.
   */
  editorPresenceIndex?: ReadonlyMap<
    WorkspaceEditorIdType,
    EditorPresenceState
  > | null;
  profile: UserWorkspaceProfileFieldsFragment;
}

/**
 * @description Chooses which editors OpenThrottle configures. Posts the contact values alongside
 * the selection so the shared `updateProfile` intent never has to tolerate a partial payload.
 */
export const SettingsWorkspaceEditorsForm = (
  props: SettingsWorkspaceEditorsFormProps,
): React.ReactElement => {
  const {
    actionError,
    className,
    editorPresence,
    editorPresenceIndex,
    profile,
  } = props;

  // Hooks
  const navigation = useNavigation();

  const [enabledEditors, setEnabledEditors] = React.useState<
    WorkspaceEditorId[]
  >([...profile.enabledEditors]);

  // Setup
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateProfile';

  // Handlers

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

        <p className="text-muted-foreground text-sm">
          {WORKSPACE_SETTINGS_COPY.editorsExplainer}
        </p>

        <div className="space-y-2">
          <Label>{WORKSPACE_SETTINGS_COPY.editorsLabel}</Label>
          <WorkspaceEditorMultiSelect
            onChange={setEnabledEditors}
            presence={editorPresenceIndex}
            value={enabledEditors}
          />
        </div>

        <WorkspaceEditorPresenceHints presence={editorPresence} />

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        <Button disabled={isSubmitting} type="submit" variant="outline">
          {isSubmitting
            ? WORKSPACE_SETTINGS_COPY.saveBusyLabel
            : WORKSPACE_SETTINGS_COPY.saveEditorsButton}
        </Button>

        <WorkspaceEditorAffiliateLinks className="border-t pt-3" />
      </Form>
    </OpenThrottleFieldset>
  );
};
