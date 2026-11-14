import type { CmsStatus } from '@openthrottle/react-router-cms-core';
import { CMS_STATUS } from '@openthrottle/react-router-cms-core';

/**
 * @description The fields the component form posts, ready for `updateCmsLibraryComponent`.
 */
export interface ComponentUpdateForm {
  readonly code: string;
  readonly name: string;
  readonly propsSchemaJson: string;
  /** `null` leaves the stored status alone. */
  readonly status: CmsStatus | null;
  readonly typename: string;
}

const STATUSES: readonly string[] = Object.values(CMS_STATUS);

const isCmsStatus = (value: unknown): value is CmsStatus => {
  return typeof value === 'string' && STATUSES.includes(value);
};

const readText = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);

  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * @description Reads an update from the posted form. Name, typename, code and the props schema
 * are all required (the columns are NOT NULL, so a blank would either be stored or silently
 * dropped); name and typename are trimmed, code and the schema are kept as typed. A missing
 * status leaves it alone; an unknown one is a malformed form.
 */
export const readComponentUpdateForm = (
  formData: FormData,
): ComponentUpdateForm | undefined => {
  const code = readText(formData, 'code');
  const name = readText(formData, 'name');
  const propsSchemaJson = readText(formData, 'propsSchemaJson');
  const typename = readText(formData, 'typename');
  const status = formData.get('status');

  if (!code || !name || !propsSchemaJson || !typename) {
    return undefined;
  }

  if (status !== null && !isCmsStatus(status)) {
    return undefined;
  }

  return {
    code,
    name: name.trim(),
    propsSchemaJson,
    status,
    typename: typename.trim(),
  };
};
