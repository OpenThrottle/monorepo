import * as React from 'react';
import classnames from 'classnames';
import { Form, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { WorkspaceEditorMultiSelect } from '~/routing/settings/components/WorkspaceEditorMultiSelect';

interface SettingsWorkspaceProfileFormProps {
  readonly actionError?: string | null;
  readonly className?: string;
  readonly profile: UserWorkspaceProfileFieldsFragment;
}

export const SettingsWorkspaceProfileForm = (
  props: SettingsWorkspaceProfileFormProps,
): React.ReactElement => {
  const { actionError, className, profile } = props;
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateProfile';

  const [enabledEditors, setEnabledEditors] = React.useState<
    WorkspaceEditorId[]
  >([...profile.enabledEditors]);

  React.useEffect(() => {
    setEnabledEditors([...profile.enabledEditors]);
  }, [profile.enabledEditors]);

  return (
    <Card
      className={classnames(className)}
      data-testid="SettingsWorkspaceProfileForm"
    >
      <CardHeader>
        <CardTitle>Contact & editors</CardTitle>
      </CardHeader>
      <CardContent>
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
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <CardFooter className="flex justify-end p-0 pt-2">
            <Button disabled={isSubmitting} type="submit" variant="outline">
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
