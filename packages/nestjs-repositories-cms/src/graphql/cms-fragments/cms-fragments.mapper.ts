import type { Fragment } from '../../modules/fragments/fragment.entity.ts';
import type { CmsFragmentObject } from './cms-fragments.object.ts';

/**
 * @description Maps a fragment row to its GraphQL object.
 */
export function toCmsFragmentObject(fragment: Fragment): CmsFragmentObject {
  return {
    createdAt: fragment.createdAt,
    isSystem: fragment.isSystem === true,
    name: fragment.name,
    propertiesJson: JSON.stringify(fragment.properties),
    schemaUuid: fragment.schemaUuid,
    typename: fragment.typename,
    updatedAt: fragment.updatedAt,
    uuid: fragment.uuid,
  };
}
