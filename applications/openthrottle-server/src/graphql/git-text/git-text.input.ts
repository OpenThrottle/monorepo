import { Field, ID, InputType } from '@nestjs/graphql';

@InputType({
  description: `Which plan (and optionally which task) to draft git text for.`,
})
export class GitTextDraftInput {
  @Field(() => ID, {
    description: `The plan the branch, PR and commits belong to.`,
  })
  planId!: string;

  @Field(() => String, {
    description: `Conventional-commit scope: the Nx project the change touches. Defaults to 'monorepo'.`,
    nullable: true,
  })
  scope!: string | null;

  @Field(() => ID, {
    description: `A task of the plan to draft a commit message for. Omit for the branch and PR only.`,
    nullable: true,
  })
  taskId!: string | null;
}
