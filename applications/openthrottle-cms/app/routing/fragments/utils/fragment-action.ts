import type { CmsFormIssues } from '@openthrottle/react-router-cms-core';
import {
  isAuthError,
  isGraphqlResponseError,
} from '@openthrottle/react-router-graphql';

import { FRAGMENT_EDITOR_COPY } from '~/routing/fragments/data/data.copy';
import type {
  FragmentActionResult,
  FragmentIssue,
} from '~/routing/fragments/types/fragment-action';

/**
 * @description The fields the fragment form posts for an update.
 */
export interface FragmentUpdateForm {
  readonly name: string | undefined;
  readonly propertiesJson: string;
}

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readIssues = (value: unknown): readonly FragmentIssue[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item: unknown) => {
    if (!isRecord(item)) return [];
    const { instancePath, message } = item;
    if (typeof message !== 'string') return [];
    const path = typeof instancePath === 'string' ? instancePath : '';

    return [{ message, path }];
  });
};

const failure = (
  message: string,
  issues: readonly FragmentIssue[] = [],
): FragmentActionResult => {
  return { issues, message, ok: false };
};

/**
 * @description Reads an update from the posted form: `properties` (the draft as JSON) is
 * required; a blank `name` means "leave the name alone".
 */
export const readFragmentUpdateForm = (
  formData: FormData,
): FragmentUpdateForm | undefined => {
  const properties = formData.get('properties');
  const name = formData.get('name');

  if (typeof properties !== 'string') {
    return undefined;
  }

  const trimmed = typeof name === 'string' ? name.trim() : '';

  return {
    name: trimmed === '' ? undefined : trimmed,
    propertiesJson: properties,
  };
};

/**
 * @description The posted `childUuid`, or `undefined` when missing or blank.
 */
export const readChildUuid = (formData: FormData): string | undefined => {
  const value = formData.get('childUuid');

  return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * @description The posted `childUuids` (a JSON array of uuids, in the new order), or `undefined`
 * when it is not one.
 */
export const readChildOrder = (
  formData: FormData,
): readonly string[] | undefined => {
  const value = formData.get('childUuids');

  if (typeof value !== 'string') {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }

  if (!Array.isArray(parsed)) {
    return undefined;
  }

  const uuids = parsed.filter((item: unknown) => typeof item === 'string');

  return uuids.length === parsed.length ? uuids : undefined;
};

/**
 * @description The action result for a failed cms mutation: server validation issues for
 * `BAD_USER_INPUT`, a sign-in or permission message for an auth refusal, otherwise the error's
 * own message.
 */
export const toFragmentActionFailure = (
  error: unknown,
): FragmentActionResult => {
  if (isAuthError(error)) {
    return failure(FRAGMENT_EDITOR_COPY.unauthenticated);
  }

  if (!isGraphqlResponseError(error)) {
    return failure(error instanceof Error ? error.message : String(error));
  }

  const { code, issues } = error.extensions;

  switch (code) {
    case 'BAD_USER_INPUT': {
      const read = readIssues(issues);

      return read.length > 0
        ? failure(FRAGMENT_EDITOR_COPY.invalid, read)
        : failure(error.message);
    }
    case 'FORBIDDEN':
      return failure(FRAGMENT_EDITOR_COPY.forbidden);
    case 'UNAUTHENTICATED':
      return failure(FRAGMENT_EDITOR_COPY.unauthenticated);
    default:
      return failure(error.message);
  }
};

/**
 * @description Groups issues by the top-level property their path points into (`/items/0/title` →
 * `items`), for the form's panes. An issue on the fragment as a whole has no pane.
 */
export const toCmsFormIssues = (
  issues: readonly FragmentIssue[],
): CmsFormIssues => {
  const grouped = new Map<string, string[]>();

  issues.forEach((issue) => {
    const segment = issue.path.split('/')[1];

    if (segment === undefined || segment === '') return;

    // A JSON Pointer escapes `/` as `~1` and `~` as `~0`.
    const key = segment.replaceAll('~1', '/').replaceAll('~0', '~');

    grouped.set(key, [...(grouped.get(key) ?? []), issue.message]);
  });

  return Object.fromEntries(grouped);
};
