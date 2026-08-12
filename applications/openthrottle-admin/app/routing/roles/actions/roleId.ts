import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AddPermissionToRoleDocument,
  DeleteRoleDocument,
  RemovePermissionFromRoleDocument,
  UpdateRoleDocument,
} from '~/__generated__/graphql';

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
      const permissionId = formData.get('permissionId');

      if (typeof permissionId === 'string' && permissionId) {
        await executeGraphqlWithAuth(request, AddPermissionToRoleDocument, {
          input: { permissionId, roleId },
        });

        return { ok: true };
      }
    }

    if (intent === 'deleteRole') {
      await executeGraphqlWithAuth(request, DeleteRoleDocument, { id: roleId });
      throw redirect('/roles');
    }

    if (intent === 'removePermission') {
      const permissionId = formData.get('permissionId');

      if (typeof permissionId === 'string' && permissionId) {
        await executeGraphqlWithAuth(
          request,
          RemovePermissionFromRoleDocument,
          {
            input: { permissionId, roleId },
          },
        );
        return { ok: true };
      }
    }

    if (intent === 'updateRole') {
      const name = formData.get('name');
      const description = formData.get('description');
      const hasDescription = typeof description === 'string';
      const hasName = typeof name === 'string';

      await executeGraphqlWithAuth(request, UpdateRoleDocument, {
        input: {
          description: hasDescription ? description.trim() || null : undefined,
          id: roleId,
          name: hasName && name.trim() ? name.trim() : undefined,
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
