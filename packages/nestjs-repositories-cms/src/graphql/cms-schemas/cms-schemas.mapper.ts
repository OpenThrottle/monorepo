import type { Schema } from '../../modules/schemas/schema.entity.ts';
import type { CmsSchemaObject } from './cms-schemas.object.ts';

/**
 * @description Maps a schema row to its GraphQL object.
 */
export function toCmsSchemaObject(schema: Schema): CmsSchemaObject {
  return {
    createdAt: schema.createdAt,
    jsonSchemaJson: JSON.stringify(schema.jsonSchema),
    status: schema.status,
    typename: schema.typename,
    updatedAt: schema.updatedAt,
    uuid: schema.uuid,
    version: schema.version,
  };
}
