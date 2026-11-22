import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/projects.$projectId._index';
import {
  ProjectDetailAddPlanDocument,
  ProjectDetailAddProjectTagDocument,
  ProjectDetailCancelProjectRunDocument,
  ProjectDetailLinkRepositoryDocument,
  ProjectDetailMovePlanDocument,
  ProjectDetailRemovePlanDocument,
  ProjectDetailRemoveProjectTagDocument,
  ProjectDetailRunProjectDocument,
  ProjectDetailUnlinkRepositoryDocument,
} from '~/__generated__/graphql';
import {
  AddProjectTagInputSchema,
  MoveProjectPlanInputSchema,
  RemoveProjectTagInputSchema,
} from '~/__generated__/schemas';

const parseProjectTagForm = (
  intent: 'addProjectTag' | 'removeProjectTag',
  formData: FormData,
) => {
  if (intent === 'addProjectTag') {
    return parseFormData(
      formData,
      AddProjectTagInputSchema().omit({ projectId: true }),
    );
  }
  return parseFormData(
    formData,
    RemoveProjectTagInputSchema().omit({ projectId: true }),
  );
};

const readField = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const runProjectStructureIntent = async (
  args: Route.ActionArgs,
  projectId: string,
  intent: string,
  formData: FormData,
) => {
  const planId = readField(formData, 'planId');
  const repositoryId = readField(formData, 'repositoryId');

  if (intent === 'linkProjectRepository' && repositoryId !== '') {
    await executeGraphqlWithAuth(
      args.request,
      ProjectDetailLinkRepositoryDocument,
      { input: { projectId, repositoryId } },
    );
  } else if (intent === 'unlinkProjectRepository' && repositoryId !== '') {
    await executeGraphqlWithAuth(
      args.request,
      ProjectDetailUnlinkRepositoryDocument,
      { input: { projectId, repositoryId } },
    );
  } else if (intent === 'addPlanToProject' && planId !== '') {
    await executeGraphqlWithAuth(args.request, ProjectDetailAddPlanDocument, {
      input: { planId, projectId },
    });
  } else if (intent === 'removePlanFromProject' && planId !== '') {
    await executeGraphqlWithAuth(
      args.request,
      ProjectDetailRemovePlanDocument,
      { input: { planId } },
    );
  } else if (intent === 'moveProjectPlan') {
    // Swaps with the neighbour in the project's full order, so a move works
    // across a page boundary the client cannot see.
    const parsed = parseFormData(formData, MoveProjectPlanInputSchema());
    if (!parsed.success) {
      return { projectError: parsed.error };
    }
    await executeGraphqlWithAuth(args.request, ProjectDetailMovePlanDocument, {
      input: parsed.data,
    });
  } else {
    return { projectError: 'Missing or unknown project change.' };
  }
  return { projectUpdated: true };
};

/**
 * @description Starts (or resumes) and cancels the project's run. A refusal (already running,
 * nothing to run) comes back as `projectRunError` for the run panel to show.
 */
const runProjectRunIntent = async (
  args: Route.ActionArgs,
  projectId: string,
  intent: 'cancelProjectRun' | 'runProject',
  formData: FormData,
) => {
  try {
    if (intent === 'runProject') {
      await executeGraphqlWithAuth(
        args.request,
        ProjectDetailRunProjectDocument,
        { input: { projectId } },
      );
      return { projectRunUpdated: true };
    }

    const projectRunId = readField(formData, 'projectRunId');
    if (projectRunId === '') {
      return { projectRunError: 'Missing project run id.' };
    }
    await executeGraphqlWithAuth(
      args.request,
      ProjectDetailCancelProjectRunDocument,
      { input: { projectRunId } },
    );
    return { projectRunUpdated: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { projectRunError: message };
  }
};

/**
 * @description Project detail mutations (tags, linked repositories, ordered plans, the project
 * run), dispatched by
 * `intent`. Extracted from the route action per route-primitive-shape R4 so the
 * route file stays a thin adapter.
 */
export const runProjectDetailAction = async (args: Route.ActionArgs) => {
  const projectId = args.params.projectId;
  if (!projectId) {
    return { projectTagError: 'Missing project id.' };
  }

  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'addProjectTag' || intent === 'removeProjectTag') {
    // `projectId` is a route param; validate only `tag` from the generated
    // schema, then inject the id.
    const parsed = parseProjectTagForm(intent, formData);
    if (!parsed.success) {
      return { projectTagError: parsed.error };
    }
    const tag = parsed.data.tag;
    try {
      if (intent === 'addProjectTag') {
        await executeGraphqlWithAuth(
          args.request,
          ProjectDetailAddProjectTagDocument,
          { input: { projectId, tag } },
        );
      } else {
        await executeGraphqlWithAuth(
          args.request,
          ProjectDetailRemoveProjectTagDocument,
          { input: { projectId, tag } },
        );
      }
      return { projectTagUpdated: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { projectTagError: message };
    }
  }

  if (
    intent === 'linkProjectRepository' ||
    intent === 'unlinkProjectRepository' ||
    intent === 'addPlanToProject' ||
    intent === 'removePlanFromProject' ||
    intent === 'moveProjectPlan'
  ) {
    try {
      return await runProjectStructureIntent(args, projectId, intent, formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { projectError: message };
    }
  }

  if (intent === 'runProject' || intent === 'cancelProjectRun') {
    return runProjectRunIntent(args, projectId, intent, formData);
  }

  return {};
};
