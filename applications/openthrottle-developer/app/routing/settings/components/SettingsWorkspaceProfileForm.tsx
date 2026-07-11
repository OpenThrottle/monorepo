import * as React from 'react';
import clsx from 'clsx';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { ComputerIcon } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { WorkspaceEditorAffiliateLinks } from '~/routing/settings/components/WorkspaceEditorAffiliateLinks';
import { WorkspaceEditorMultiSelect } from '~/routing/settings/components/WorkspaceEditorMultiSelect';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';

export interface SettingsWorkspaceProfileFormProps {
  actionError?: string | null;
  className?: string;
  profile: UserWorkspaceProfileFieldsFragment;
}

export const SettingsWorkspaceProfileForm = (
  props: SettingsWorkspaceProfileFormProps,
): React.ReactElement => {
  const { actionError, className, profile } = props;

  // Hooks
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateProfile';

  const [enabledEditors, setEnabledEditors] = React.useState<
    WorkspaceEditorId[]
  >([...profile.enabledEditors]);

  // Setup

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
      id="settings-workspace-profile-form"
      legend="Contact & editors"
    >
      <div
        className={clsx('space-y-4 md:space-y-8', className)}
        data-testid="SettingsWorkspaceProfileForm"
      >
        <p className="text-muted-foreground text-sm">
          OpenThrottle can write MCP, skills, and rules into linked repos for
          the editors you enable.
        </p>

        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="updateProfile" />

          <div className="space-y-2">
            <Label htmlFor="workspace-contact-display-name">Display name</Label>
            <Input
              defaultValue={profile.contactDisplayName ?? ''}
              id="workspace-contact-display-name"
              name="contactDisplayName"
              placeholder="Your name"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-contact-email">Contact email</Label>
            <Input
              defaultValue={profile.contactEmail ?? ''}
              id="workspace-contact-email"
              name="contactEmail"
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div className="space-y-2">
            <Label>Editors to configure</Label>
            <p className="text-muted-foreground text-sm">
              OpenThrottle can write MCP, skills, and rules into linked repos
              for the editors you enable.
            </p>
            <WorkspaceEditorMultiSelect
              onChange={setEnabledEditors}
              value={enabledEditors}
            />
            <WorkspaceEditorAffiliateLinks />
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <Button disabled={isSubmitting} type="submit" variant="outline">
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </Button>
        </Form>
      </div>
    </OpenThrottleFieldset>
  );
};
