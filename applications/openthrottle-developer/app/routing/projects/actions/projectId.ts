import { toErrorMessage } from '@openthrottle/nodejs-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/projects.$projectId._index';
import {
  ProjectDetailAddPlanDocument,
  ProjectDetailAddProjectTagDocument,
  ProjectDetailLinkRepositoryDocument,
  ProjectDetailMovePlanDocument,
  ProjectDetailRemovePlanDocument,
  ProjectDetailRemoveProjectTagDocument,
  ProjectDetailUnlinkRepositoryDocument,
} from '~/__generated__/graphql';
import {
  AddProjectTagInputSchema,
  MoveProjectPlanInputSchema,
  RemoveProjectTagInputSchema,
} from '~/__generated__/schemas';
import { runSetProjectFavoriteIntent } from '~/routing/projects/actions/projectFavorite';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/copy';

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

/**
 * @description Adds every submitted `planId` in the order picked. The adds run
 * one at a time on purpose: each appends after the project's current last plan,
 * so concurrent adds would race for the same sort position. A failed add does
 * not stop the rest; the result names how many did not land.
 */
const addPlansToProject = async (
  args: Route.ActionArgs,
  projectId: string,
  formData: FormData,
) => {
  const planIds = formData
    .getAll('planId')
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value !== '');
  if (planIds.length === 0) {
    return { projectError: 'Pick at least one plan to add.' };
  }

  let failed = 0;
  for (const planId of planIds) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential by design: each add appends at the current end of the order
      await executeGraphqlWithAuth(args.request, ProjectDetailAddPlanDocument, {
        input: { planId, projectId },
      });
    } catch {
      failed += 1;
    }
  }

  if (failed > 0) {
    return {
      projectError: `${PROJECT_PLANS_COPY.addFailedPrefix} ${failed} of ${planIds.length} plans.`,
    };
  }
  return { projectUpdated: true };
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
  } else if (intent === 'addPlanToProject') {
    return addPlansToProject(args, projectId, formData);
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
 * @description Project detail mutations (tags, linked repositories, ordered plans), dispatched by
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

  if (intent === 'setProjectFavorite') {
    return runSetProjectFavoriteIntent(args.request, formData);
  }

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
      const message = toErrorMessage(error);
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
      const message = toErrorMessage(error);
      return { projectError: message };
    }
  }

  return {};
};
