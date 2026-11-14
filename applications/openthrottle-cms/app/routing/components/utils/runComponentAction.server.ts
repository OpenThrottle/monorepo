import { UpdateCmsLibraryComponentDocument } from '~/__generated__/graphql';
import { fetchAuthGraphql } from '~/global/utils/graphql.server';
import { toCmsActionFailure } from '~/global/utils/toCmsActionFailure';
import { COMPONENT_EDITOR_COPY } from '~/routing/components/data/data.copy';
import type { ComponentActionResult } from '~/routing/components/types/component-action';
import { readComponentUpdateForm } from '~/routing/components/utils/readComponentUpdateForm';

/**
 * @description Saves the posted component form to `uuid` as the signed-in user. Never throws; a
 * refusal comes back as a failed {@link ComponentActionResult}.
 */
export const runComponentAction = async (
  request: Request,
  uuid: string,
): Promise<ComponentActionResult> => {
  const form = readComponentUpdateForm(await request.formData());

  if (!form) {
    return {
      issues: [],
      message: COMPONENT_EDITOR_COPY.invalidForm,
      ok: false,
      requiresSignIn: false,
    };
  }

  try {
    await fetchAuthGraphql(request, UpdateCmsLibraryComponentDocument, {
      input: { ...form, uuid },
    });
  } catch (error) {
    return toCmsActionFailure(error, COMPONENT_EDITOR_COPY);
  }

  return { ok: true };
};
