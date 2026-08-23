import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
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
  Separator,
  Switch,
} from '@openthrottle/react-router-shadcn';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_REPOSITORY_DETAIL_COPY } from '~/routing/settings/data/data.copy';
import { RepositoryProjectSelect } from '~/routing/settings/repositories/components/RepositoryProjectSelect';
import type { ProjectOption } from '~/routing/settings/repositories/components/RepositoryProjectSelect';
import { FolderPenIcon } from 'lucide-react';

export interface RepositoryEditFormProps {
  actionError?: string | null;
  cancelTo: string;
  projects: ProjectOption[];
  repository: WorkspaceRepositoryFieldsFragment;
}

export const RepositoryEditForm = (
  props: RepositoryEditFormProps,
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
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={FolderPenIcon}
          title={WORKSPACE_REPOSITORY_DETAIL_COPY.editTitle}
        />
        <p className="text-muted-foreground text-sm">
          {WORKSPACE_REPOSITORY_DETAIL_COPY.editDescription}
        </p>
      </div>

      <Card data-testid="RepositoryEditForm">
        <CardHeader>
          <CardTitle className="text-base">
            {WORKSPACE_REPOSITORY_DETAIL_COPY.identitySectionTitle}
          </CardTitle>
          <CardDescription>
            {WORKSPACE_REPOSITORY_DETAIL_COPY.identitySectionDescription}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form className="space-y-8" method="post">
            <input name="intent" type="hidden" value="updateRepository" />

            <section className="space-y-6">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="repository-default-branch">
                  {WORKSPACE_REPOSITORY_DETAIL_COPY.branchLabel}
                </Label>
                <Input
                  defaultValue={repository.defaultBranch ?? ''}
                  id="repository-default-branch"
                  name="defaultBranch"
                  placeholder={
                    WORKSPACE_REPOSITORY_DETAIL_COPY.branchPlaceholder
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {WORKSPACE_REPOSITORY_DETAIL_COPY.branchHelp}
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {WORKSPACE_REPOSITORY_DETAIL_COPY.integrationSectionTitle}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {
                    WORKSPACE_REPOSITORY_DETAIL_COPY.integrationSectionDescription
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repository-project">
                  {WORKSPACE_REPOSITORY_DETAIL_COPY.projectLabel}
                </Label>
                <RepositoryProjectSelect
                  currentProjectId={repository.projectId ?? null}
                  name="projectId"
                  projects={projects}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="repository-foreign-skill-injection">
                    {WORKSPACE_REPOSITORY_DETAIL_COPY.injectionLabel}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {WORKSPACE_REPOSITORY_DETAIL_COPY.injectionHelp}
                  </p>
                </div>
                <input
                  name="foreignSkillInjectionEnabled"
                  type="hidden"
                  value={String(injectionEnabled)}
                />
                <Switch
                  checked={injectionEnabled}
                  className="mt-0.5 shrink-0"
                  data-testid="RepositoryEditForm-injection"
                  id="repository-foreign-skill-injection"
                  onCheckedChange={setInjectionEnabled}
                />
              </div>
            </section>

            {actionError ? (
              <p
                className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
                role="alert"
              >
                {actionError}
              </p>
            ) : null}

            <Separator />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild={true} type="button" variant="ghost">
                <Link to={cancelTo}>
                  {WORKSPACE_REPOSITORY_DETAIL_COPY.cancelButton}
                </Link>
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting
                  ? WORKSPACE_REPOSITORY_DETAIL_COPY.savingButton
                  : WORKSPACE_REPOSITORY_DETAIL_COPY.saveButton}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};
