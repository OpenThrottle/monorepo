/**
 * @description GraphQL shape of one cms schema sync: what it wrote, as `typename@version` labels.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `What one sync of the generated block schemas into the cms schemas table changed. All three lists empty means everything was already in sync.`,
})
export class CmsSchemaSyncResultObject {
  @Field(() => [String], {
    description: `Versions that existed but were not ACTIVE and are now (typename@version).`,
  })
  activated!: string[];

  @Field(() => [String], {
    description: `Older ACTIVE versions now DISABLED; fragments pinned to them keep them (typename@version).`,
  })
  disabled!: string[];

  @Field(() => [String], {
    description: `Versions inserted as new ACTIVE rows (typename@version).`,
  })
  inserted!: string[];

  @Field(() => Int, {
    description: `How many generated block schemas the manifests list.`,
  })
  total!: number;
}
