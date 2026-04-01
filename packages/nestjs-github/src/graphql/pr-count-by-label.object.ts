/**
 * @description GraphQL object type for PR count per label (breakdown by type or priority).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PrCountByLabelObject {
  @Field(() => Int, {
    description:
      'Number of PRs that have this label (a PR with multiple labels is counted under each).',
  })
  count!: number;

  @Field(() => String, {
    description: 'Label name (e.g. bug, feature, docs).',
  })
  label!: string;
}
