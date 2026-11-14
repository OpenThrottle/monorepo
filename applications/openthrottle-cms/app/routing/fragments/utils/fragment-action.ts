import type { CmsFormIssues } from '@openthrottle/react-router-cms-core';

import type { CmsActionIssue } from '~/global/types/cms-action';

/**
 * @description The fields the fragment form posts for an update.
 */
export interface FragmentUpdateForm {
  readonly name: string | undefined;
  readonly propertiesJson: string;
}

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
 * @description The fields the create-child form posts.
 */
export interface FragmentNewChildForm {
  readonly name: string;
  readonly typename: string;
}

/**
 * @description Reads a new child from the posted form: a `typename` is required; a blank `name`
 * falls back to the typename, since the server requires one.
 */
export const readNewChildForm = (
  formData: FormData,
): FragmentNewChildForm | undefined => {
  const typename = formData.get('typename');
  const name = formData.get('name');

  if (typeof typename !== 'string' || typename.trim() === '') {
    return undefined;
  }

  const trimmed = typeof name === 'string' ? name.trim() : '';

  return {
    name: trimmed === '' ? typename.trim() : trimmed,
    typename: typename.trim(),
  };
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
 * @description Groups issues by the top-level property their path points into (`/items/0/title` →
 * `items`), for the form's panes. An issue on the fragment as a whole has no pane.
 */
export const toCmsFormIssues = (
  issues: readonly CmsActionIssue[],
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
