import {
  AddCmsFragmentChildDocument,
  CreateCmsFragmentChildDocument,
  RemoveCmsFragmentChildDocument,
  ReorderCmsFragmentChildrenDocument,
  UpdateCmsFragmentDocument,
} from '~/__generated__/graphql';
import { fetchAuthGraphql } from '~/global/utils/graphql.server';
import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import type { FragmentIntent } from '~/routing/fragments/data/data.intents';
import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import type { FragmentActionResult } from '~/routing/fragments/types/fragment-action';
import {
  readChildOrder,
  readChildUuid,
  readFragmentUpdateForm,
  readNewChildForm,
  toFragmentActionFailure,
} from '~/routing/fragments/utils/fragment-action';

const INTENTS: readonly string[] = Object.values(FRAGMENT_INTENT);

const isFragmentIntent = (value: unknown): value is FragmentIntent => {
  return typeof value === 'string' && INTENTS.includes(value);
};

const invalidForm = (): FragmentActionResult => {
  return {
    issues: [],
    message: FRAGMENT_EDITOR_COPY.invalidForm,
    ok: false,
    requiresSignIn: false,
  };
};

/**
 * @description Runs one posted intent of the fragment route against `uuid` as the signed-in user:
 * an update (name + properties), a child edge add, remove or reorder, or a new child created
 * and attached. Never throws; a refusal
 * comes back as a failed {@link FragmentActionResult}.
 */
export const runFragmentAction = async (
  request: Request,
  uuid: string,
): Promise<FragmentActionResult> => {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (!isFragmentIntent(intent)) {
    return {
      issues: [],
      message: FRAGMENT_EDITOR_COPY.unknownIntent,
      ok: false,
      requiresSignIn: false,
    };
  }

  try {
    switch (intent) {
      case FRAGMENT_INTENT.ADD_CHILD: {
        const childUuid = readChildUuid(formData);

        if (!childUuid) return invalidForm();
        await fetchAuthGraphql(request, AddCmsFragmentChildDocument, {
          childUuid,
          parentUuid: uuid,
        });
        break;
      }
      case FRAGMENT_INTENT.CREATE_CHILD: {
        const form = readNewChildForm(formData);

        if (!form) return invalidForm();
        // Two writes, not one transaction: a failed attach leaves a parentless fragment, which
        // the fragments list still shows and a later add can attach.
        const created = await fetchAuthGraphql(
          request,
          CreateCmsFragmentChildDocument,
          { input: { ...form, propertiesJson: null } },
        );
        await fetchAuthGraphql(request, AddCmsFragmentChildDocument, {
          childUuid: created.createCmsFragment.uuid,
          parentUuid: uuid,
        });
        break;
      }
      case FRAGMENT_INTENT.REMOVE_CHILD: {
        const childUuid = readChildUuid(formData);

        if (!childUuid) return invalidForm();
        await fetchAuthGraphql(request, RemoveCmsFragmentChildDocument, {
          childUuid,
          parentUuid: uuid,
        });
        break;
      }
      case FRAGMENT_INTENT.REORDER_CHILDREN: {
        const childUuids = readChildOrder(formData);

        if (!childUuids) return invalidForm();
        await fetchAuthGraphql(request, ReorderCmsFragmentChildrenDocument, {
          childUuids: [...childUuids],
          parentUuid: uuid,
        });
        break;
      }
      case FRAGMENT_INTENT.UPDATE: {
        const form = readFragmentUpdateForm(formData);

        if (!form) return invalidForm();
        await fetchAuthGraphql(request, UpdateCmsFragmentDocument, {
          input: { ...form, uuid },
        });
        break;
      }
    }
  } catch (error) {
    return toFragmentActionFailure(error);
  }

  return { intent, ok: true };
};
