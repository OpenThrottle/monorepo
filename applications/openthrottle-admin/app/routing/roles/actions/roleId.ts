import { redirect } from 'react-router';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  AddPermissionToRoleDocument,
  DeleteRoleDocument,
  RemovePermissionFromRoleDocument,
  UpdateRoleDocument,
} from '~/__generated__/graphql';
import {
  AddPermissionToRoleInputSchema,
  RemovePermissionFromRoleInputSchema,
  UpdateRoleInputSchema,
} from '~/__generated__/schemas';

/**
 * Intent handler backing the `roles.$roleId` route action. Dispatches the
 * add/remove-permission, delete-role, and update-role mutations by `intent`,
 * returning `{ ok }` on success or `{ error }` on failure. Delete throws a
 * redirect to `/roles`; other thrown Responses are re-thrown as control flow.
 */
export const runRoleDetailAction = async (
  request: Request,
  roleId: string | undefined,
): Promise<{ error: string } | { ok: true }> => {
  if (!roleId) {
    return { error: 'Role not found' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'addPermission') {
      const parsed = parseFormData(
        formData,
        AddPermissionToRoleInputSchema().omit({ roleId: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: 'A permission is required.' };
      }

      await executeGraphqlWithAuth(request, AddPermissionToRoleDocument, {
        input: { permissionId: parsed.data.permissionId, roleId },
      });

      return { ok: true };
    }

    if (intent === 'deleteRole') {
      await executeGraphqlWithAuth(request, DeleteRoleDocument, { id: roleId });
      throw redirect('/roles');
    }

    if (intent === 'removePermission') {
      const parsed = parseFormData(
        formData,
        RemovePermissionFromRoleInputSchema().omit({ roleId: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: 'A permission is required.' };
      }

      await executeGraphqlWithAuth(request, RemovePermissionFromRoleDocument, {
        input: { permissionId: parsed.data.permissionId, roleId },
      });

      return { ok: true };
    }

    if (intent === 'updateRole') {
      const parsed = parseFormData(
        formData,
        UpdateRoleInputSchema().omit({ id: true }),
        { strict: false },
      );
      if (!parsed.success) {
        return { error: parsed.error };
      }

      await executeGraphqlWithAuth(request, UpdateRoleDocument, {
        input: {
          description: parsed.data.description ?? null,
          id: roleId,
          name: parsed.data.name,
        },
      });

      return { ok: true };
    }
  } catch (error) {
    // 🚨 Let redirects (and other Responses) escape — they are control flow, not failures.
    if (error instanceof Response) {
      throw error;
    }

    const isError = error instanceof Error;
    const message = isError ? error.message : 'Action failed';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};
