import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AssignRoleToUserDocument,
  DisableUserDocument,
  EnableUserDocument,
  RemoveRoleFromUserDocument,
  UpdateUserDocument,
} from '~/__generated__/graphql';

/**
 * Intent handler backing the `users.$userId` route action. Dispatches the
 * assign/remove-role, enable/disable, and update-user mutations by `intent`,
 * returning `{ ok }` on success or `{ error }` on failure; throws on an
 * unrecognized intent.
 */
export const runUserDetailAction = async (
  request: Request,
  userId: string | undefined,
): Promise<{ error: string } | { ok: true }> => {
  if (!userId) {
    return { error: 'User not found' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'assignRole') {
      const roleId = formData.get('roleId');

      if (typeof roleId === 'string' && roleId) {
        await executeGraphqlWithAuth(request, AssignRoleToUserDocument, {
          input: { roleId, userId },
        });

        return { ok: true };
      }
    }

    if (intent === 'disableUser') {
      await executeGraphqlWithAuth(request, DisableUserDocument, {
        id: userId,
      });

      return { ok: true };
    }

    if (intent === 'enableUser') {
      await executeGraphqlWithAuth(request, EnableUserDocument, { id: userId });

      return { ok: true };
    }

    if (intent === 'removeRole') {
      const roleId = formData.get('roleId');

      if (typeof roleId === 'string' && roleId) {
        await executeGraphqlWithAuth(request, RemoveRoleFromUserDocument, {
          input: { roleId, userId },
        });

        return { ok: true };
      }
    }

    if (intent === 'updateUser') {
      const email = formData.get('email');
      const githubUsername = formData.get('githubUsername');

      await executeGraphqlWithAuth(request, UpdateUserDocument, {
        input: {
          email:
            typeof email === 'string' && email.trim()
              ? email.trim()
              : undefined,
          githubUsername:
            typeof githubUsername === 'string' && githubUsername.trim()
              ? githubUsername.trim()
              : undefined,
          id: userId,
        },
      });

      return { ok: true };
    }
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Action failed';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};
