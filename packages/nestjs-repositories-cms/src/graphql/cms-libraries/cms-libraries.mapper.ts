import type { Library } from '../../modules/libraries/library.entity.ts';
import type { LibraryComponent } from '../../modules/library-components/library-component.entity.ts';
import type {
  CmsLibraryComponentObject,
  CmsLibraryObject,
} from './cms-libraries.object.ts';

/**
 * @description Maps a library component row to its GraphQL object.
 */
export function toCmsLibraryComponentObject(
  component: LibraryComponent,
): CmsLibraryComponentObject {
  return {
    code: component.code,
    libraryUuid: component.libraryUuid,
    name: component.name,
    propsSchemaJson: JSON.stringify(component.propsSchema),
    status: component.status,
    typename: component.typename,
    uuid: component.uuid,
  };
}

/**
 * @description Maps a library row and its components to the GraphQL object.
 */
export function toCmsLibraryObject(
  library: Library,
  components: readonly LibraryComponent[],
): CmsLibraryObject {
  return {
    components: components.map(toCmsLibraryComponentObject),
    createdAt: library.createdAt,
    description: library.description,
    name: library.name,
    status: library.status,
    updatedAt: library.updatedAt,
    uuid: library.uuid,
  };
}
