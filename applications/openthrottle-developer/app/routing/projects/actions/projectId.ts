import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  ProjectDetailAddProjectTagDocument,
  ProjectDetailRemoveProjectTagDocument,
} from '~/__generated__/graphql';
import {
  AddProjectTagInputSchema,
  RemoveProjectTagInputSchema,
} from '~/__generated__/schemas';
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

  if (intent === 'addProjectTag' || intent === 'removeProjectTag') {
    // `projectId` is a route param; validate only `tag` from the generated
    // schema, then inject the id.
    const parsed =
      intent === 'addProjectTag'
        ? parseFormData(
            formData,
            AddProjectTagInputSchema().omit({ projectId: true }),
          )
        : parseFormData(
            formData,
            RemoveProjectTagInputSchema().omit({ projectId: true }),
          );
    if (!parsed.success) {
      return { projectTagError: 'Tag is required.' };
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

  return {};
};
