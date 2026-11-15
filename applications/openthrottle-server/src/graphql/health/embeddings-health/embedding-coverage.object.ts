import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Embedding coverage for one source table: how many rows that should be searchable have an up-to-date vector from the configured model.`,
})
export class EmbeddingCoverageObject {
  @Field(() => Int, {
    description: `Rows with an up-to-date vector (configured model, current text).`,
  })
  embedded!: number;

  @Field(() => String, {
    description: `Entity: plan | task | documentation | custom_prompt | code.`,
  })
  entity!: string;

  @Field(() => Int, {
    description: `Rows whose vector is from another model or from text that has since changed; the reconciler re-embeds them.`,
  })
  stale!: number;

  @Field(() => String, { description: `Embedding table name.` })
  table!: string;

  @Field(() => Int, {
    description: `Source rows that should have a vector (non-empty text, not soft-deleted or superseded).`,
  })
  total!: number;
}
