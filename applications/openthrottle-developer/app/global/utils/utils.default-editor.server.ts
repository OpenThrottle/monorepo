import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { GetMyDefaultEditorDocument } from '~/__generated__/graphql';

/**
 * @description Fetches the current user's `userPreferences.defaultEditor`.
 * Never throws: a logged-out visitor, a failed request, or an unset preference
 * all resolve to `null`, which every editor link reads as "system default"
 * (VS Code) — exactly today's behavior.
 */
export const fetchMyDefaultEditor = async (
  request: Request,
): Promise<WorkspaceEditorId | null> => {
  if (getAuthTokenFromCookie(request.headers.get('cookie') ?? '') === null) {
    return null;
  }

  try {
    const { userPreferences } = await executeGraphqlWithAuth(
      request,
      GetMyDefaultEditorDocument,
    );

    return userPreferences.defaultEditor ?? null;
  } catch (error) {
    console.error('preferences: GetMyDefaultEditor failed', error);

    return null;
  }
};
