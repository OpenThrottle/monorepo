import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  ProjectDetailAddProjectTagDocument,
  ProjectDetailRemoveProjectTagDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/projects.$projectId._index';

/**
 * @description Project detail tag mutations (add / remove), dispatched by
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
  const tag = formData.get('tag');

  if (intent === 'addProjectTag' || intent === 'removeProjectTag') {
    if (typeof tag !== 'string' || tag.trim() === '') {
      return { projectTagError: 'Tag is required.' };
    }
    try {
      if (intent === 'addProjectTag') {
        await executeGraphqlWithAuth(
          args.request,
          ProjectDetailAddProjectTagDocument,
          { input: { projectId, tag: tag.trim() } },
        );
      } else {
        await executeGraphqlWithAuth(
          args.request,
          ProjectDetailRemoveProjectTagDocument,
          { input: { projectId, tag: tag.trim() } },
        );
      }
      return { projectTagUpdated: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { projectTagError: message };
    }
  }

  return {};
};
