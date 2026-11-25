import {
  Button,
  Card,
  CardContent,
  CardFooter,
  cn,
  Input,
  Label,
  MultiSelect,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form, Link } from 'react-router';

import type { ProjectRepositoryRowFragment } from '~/__generated__/graphql';
import { PROJECT_FORM_COPY } from '~/routing/projects/data/copy';

export interface ProjectFormDefaultValues {
  readonly description: string | null | undefined;
  readonly name: string | null | undefined;
}

export interface ProjectFormProps {
  readonly actionData?: { readonly error?: string } | null;
  readonly cancelTo?: string;
  readonly className?: string;
  readonly defaultValues?: ProjectFormDefaultValues;
  /**
   * Repositories offered for linking at create time; `undefined` hides the
   * field (the edit route manages links on the project page instead).
   */
  readonly repositories: readonly ProjectRepositoryRowFragment[] | undefined;
  readonly submitLabel?: string;
}

/**
 * @description Create/edit form for a project (an initiative): name,
 * description and, on create, the repositories to link. Selected repositories
 * post as repeated `repositoryIds` fields.
 */
export const ProjectForm = (props: ProjectFormProps): React.ReactElement => {
  const {
    actionData,
    cancelTo = '/projects',
    className,
    defaultValues,
    repositories,
    submitLabel = PROJECT_FORM_COPY.createSubmit,
  } = props;

  // Hooks
  const [repositoryIds, setRepositoryIds] = React.useState<readonly string[]>(
    [],
  );

  // Setup
  const error = actionData?.error;
  const repositoryOptions = (repositories ?? []).map((repository) => ({
    hint: repository.normalizedRemoteUrl ?? undefined,
    label: repository.name,
    value: repository.id,
  }));
  const showRepositories = repositories !== undefined;

  // Handlers

  // Markup
  const errorMarkup = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );
  const repositoriesMarkup = (
    <div className="space-y-2">
      <Label>{PROJECT_FORM_COPY.repositoriesLabel}</Label>
      <MultiSelect
        className="min-h-9 py-1.5"
        emptyText={PROJECT_FORM_COPY.repositoriesEmpty}
        onChange={setRepositoryIds}
        options={repositoryOptions}
        placeholder={PROJECT_FORM_COPY.repositoriesPlaceholder}
        searchPlaceholder={PROJECT_FORM_COPY.repositoriesSearch}
        value={repositoryIds}
      />
      {repositoryIds.map((id) => (
        <input key={id} name="repositoryIds" type="hidden" value={id} />
      ))}
      <p className="text-muted-foreground text-xs">
        {PROJECT_FORM_COPY.repositoriesHint}
      </p>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={cn('w-full', className)} data-testid="ProjectForm">
      <CardContent>
        <Form className="w-full space-y-4 pt-8" method="post">
          <div className="space-y-2">
            <Label htmlFor="project-name">{PROJECT_FORM_COPY.nameLabel}</Label>
            <Input
              defaultValue={defaultValues?.name ?? undefined}
              id="project-name"
              name="name"
              placeholder={PROJECT_FORM_COPY.namePlaceholder}
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">
              {PROJECT_FORM_COPY.descriptionLabel}
            </Label>
            <TextArea
              defaultValue={defaultValues?.description ?? undefined}
              id="project-description"
              name="description"
              placeholder={PROJECT_FORM_COPY.descriptionPlaceholder}
              rows={4}
            />
          </div>

          {showRepositories ? repositoriesMarkup : null}

          {error ? errorMarkup : null}

          <CardFooter className="flex justify-end gap-3 p-0 pt-4">
            <Button asChild={true} variant="ghost">
              <Link to={cancelTo}>{PROJECT_FORM_COPY.cancel}</Link>
            </Button>
            <Button type="submit" variant="outline">
              {submitLabel}
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
