import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  AssignRoleToUserDocument,
  DisableUserDocument,
  EnableUserDocument,
  RemoveRoleFromUserDocument,
  UpdateUserDocument,
} from '~/__generated__/graphql';
import {
  AssignRoleToUserInputSchema,
  RemoveRoleFromUserInputSchema,
  UpdateUserInputSchema,
} from '~/__generated__/schemas';

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
      const parsed = parseFormData(
        formData,
        AssignRoleToUserInputSchema().omit({ userId: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: 'A role is required.' };
      }

      await executeGraphqlWithAuth(request, AssignRoleToUserDocument, {
        input: { roleId: parsed.data.roleId, userId },
      });

      return { ok: true };
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
      const parsed = parseFormData(
        formData,
        RemoveRoleFromUserInputSchema().omit({ userId: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: 'A role is required.' };
      }

      await executeGraphqlWithAuth(request, RemoveRoleFromUserDocument, {
        input: { roleId: parsed.data.roleId, userId },
      });

      return { ok: true };
    }

    if (intent === 'updateUser') {
      const parsed = parseFormData(
        formData,
        UpdateUserInputSchema().omit({ disabledAt: true, id: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: parsed.error };
      }

      await executeGraphqlWithAuth(request, UpdateUserDocument, {
        input: { ...parsed.data, id: userId },
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
