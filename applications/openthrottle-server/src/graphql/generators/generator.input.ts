/**
 * @description GraphQL input types for generator queries. Single input arg per operation for consistency with other resolvers.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetGeneratorInput {
  @Field(() => String, {
    description: `Generator name (e.g. from @tools/generators)`,
  })
  name!: string;
}
