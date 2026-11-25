import { toErrorMessage } from '@openthrottle/nodejs-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import { ProjectSetFavoriteDocument } from '~/__generated__/graphql';
import { PROJECT_FAVORITE_COPY } from '~/routing/projects/data/copy';

/** @description Result of the `setProjectFavorite` intent, spread into the route's action data. */
export type ProjectFavoriteActionResult =
  | { readonly favorite: boolean; readonly projectId: string }
  | { readonly projectFavoriteError: string };

/**
 * @description Handles the `setProjectFavorite` intent shared by the projects index
 * and project detail route actions: reads `projectId` and `favorite` from the form
 * and stars or unstars the project for the current user. Failures come back as
 * `projectFavoriteError` instead of throwing, so the optimistic star reverts.
 */
export const runSetProjectFavoriteIntent = async (
  request: Request,
  formData: FormData,
): Promise<ProjectFavoriteActionResult> => {
  const projectId = formData.get('projectId');
  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return { projectFavoriteError: PROJECT_FAVORITE_COPY.missingProject };
  }
  const favorite = formData.get('favorite') === 'true';

  try {
    const data = await executeGraphqlWithAuth(
      request,
      ProjectSetFavoriteDocument,
      { favorite, projectId: projectId.trim() },
    );
    return {
      favorite: data.setProjectFavorite.favorite,
      projectId: data.setProjectFavorite.projectId,
    };
  } catch (error) {
    return { projectFavoriteError: toErrorMessage(error) };
  }
};
