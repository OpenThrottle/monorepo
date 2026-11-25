import { toErrorMessageOr } from '@openthrottle/nodejs-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { redirect } from 'react-router';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/projects.$projectId.edit';
import {
  ProjectEditDeleteProjectDocument,
  UpdateProjectDocument,
} from '~/__generated__/graphql';
import { UpdateProjectInputSchema } from '~/__generated__/schemas';
import {
  PROJECT_EDIT_COPY,
  PROJECT_FORM_COPY,
} from '~/routing/projects/data/copy';

export interface ProjectEditActionError {
  readonly error: string;
}

/**
 * @description Soft-deletes the project and returns to the list. Its plans keep
 * their rows and read as unassigned.
 */
export const deleteProject = async (
  args: Route.ActionArgs,
  projectId: string,
): Promise<Response | ProjectEditActionError> => {
  try {
    await executeGraphqlWithAuth(
      args.request,
      ProjectEditDeleteProjectDocument,
      { input: { id: projectId } },
    );

    return redirect('/projects');
  } catch (error) {
    return { error: toErrorMessageOr(error, PROJECT_EDIT_COPY.deleteFailed) };
  }
};

/**
 * @description Saves name and description, then returns to the project.
 */
export const updateProject = async (
  args: Route.ActionArgs,
  projectId: string,
  formData: FormData,
): Promise<Response | ProjectEditActionError> => {
  // `id` is the route param. `name` is required at the UI layer (the generated
  // Update schema leaves it optional), so tighten it to `min(1)`. `description`
  // clears to `null` when blank. `nxProjectName` is deprecated and never sent:
  // omitting it leaves the stored value alone, which the skills default lookup
  // still reads.
  const parsed = parseFormData(
    formData,
    UpdateProjectInputSchema()
      .omit({ id: true, nxProjectName: true })
      .extend({ name: z.string().min(1) }),
  );
  if (!parsed.success) {
    return { error: PROJECT_FORM_COPY.nameMissing };
  }

  const input = {
    description: parsed.data.description ?? null,
    id: projectId,
    name: parsed.data.name,
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdateProjectDocument,
      { input },
    );

    if (!result.updateProject?.id) {
      return { error: PROJECT_EDIT_COPY.updateFailed };
    }

    return redirect(`/projects/${result.updateProject.id}`);
  } catch (error) {
    return { error: toErrorMessageOr(error, PROJECT_EDIT_COPY.updateFailed) };
  }
};
