import * as React from 'react';
import { Form, Link, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from '@openthrottle/react-router-shadcn';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_REPOSITORY_DETAIL_COPY } from '~/routing/settings/data/data.copy';
import { WorkspaceRepositoriesProjectSelect } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';
import type { ProjectOption } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';

export interface WorkspaceRepositoryEditFormProps {
  actionError?: string | null;
  cancelTo: string;
  projects: ProjectOption[];
  repository: WorkspaceRepositoryFieldsFragment;
}

export const WorkspaceRepositoryEditForm = (
  props: WorkspaceRepositoryEditFormProps,
): React.ReactElement => {
  const { actionError, cancelTo, projects, repository } = props;

  // Hooks
  const navigation = useNavigation();
  // The injection opt-in lives per-checkout; the user's checkouts of this repo are
  // flipped together, so any checkout reflects the current state.
  const [injectionEnabled, setInjectionEnabled] = React.useState(
    (repository.checkouts ?? []).some(
      (checkout) => checkout.foreignSkillInjectionEnabled,
    ),
  );

  // Setup
  const submitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateRepository';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="WorkspaceRepositoryEditForm">
      <CardHeader>
        <CardTitle className="text-base">
          {WORKSPACE_REPOSITORY_DETAIL_COPY.editTitle}
        </CardTitle>
        <CardDescription>
          {WORKSPACE_REPOSITORY_DETAIL_COPY.editDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form className="space-y-6" method="post">
          <input name="intent" type="hidden" value="updateRepository" />

          <div className="space-y-1">
            <Label htmlFor="repository-name">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.nameLabel}
            </Label>
            <Input
              defaultValue={repository.name}
              id="repository-name"
              name="name"
              placeholder={WORKSPACE_REPOSITORY_DETAIL_COPY.namePlaceholder}
              required={true}
            />
            <p className="text-muted-foreground text-xs">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.nameHelp}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="repository-default-branch">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.branchLabel}
            </Label>
            <Input
              defaultValue={repository.defaultBranch ?? ''}
              id="repository-default-branch"
              name="defaultBranch"
              placeholder={WORKSPACE_REPOSITORY_DETAIL_COPY.branchPlaceholder}
            />
            <p className="text-muted-foreground text-xs">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.branchHelp}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="repository-project">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.projectLabel}
            </Label>
            <WorkspaceRepositoriesProjectSelect
              currentProjectId={repository.projectId ?? null}
              name="projectId"
              projects={projects}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="repository-foreign-skill-injection">
                {WORKSPACE_REPOSITORY_DETAIL_COPY.injectionLabel}
              </Label>
              <input
                name="foreignSkillInjectionEnabled"
                type="hidden"
                value={String(injectionEnabled)}
              />
              <Switch
                checked={injectionEnabled}
                data-testid="WorkspaceRepositoryEditForm-injection"
                id="repository-foreign-skill-injection"
                onCheckedChange={setInjectionEnabled}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.injectionHelp}
            </p>
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button disabled={submitting} type="submit">
              {submitting
                ? 'Saving…'
                : WORKSPACE_REPOSITORY_DETAIL_COPY.saveButton}
            </Button>
            <Button asChild={true} type="button" variant="ghost">
              <Link to={cancelTo}>
                {WORKSPACE_REPOSITORY_DETAIL_COPY.cancelButton}
              </Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};
