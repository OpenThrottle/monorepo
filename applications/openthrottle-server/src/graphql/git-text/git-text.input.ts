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
    description: `The target repo's PR template (its raw markdown). The body keeps its headings and checklists and fills the first section. Omit for the default sections.`,
    nullable: true,
  })
  pullRequestTemplate!: string | null;

  @Field(() => String, {
    description: `Conventional-commit scope, e.g. the Nx project touched; send one the repo's commitlint accepts. Omitted or malformed, the header has no scope: type: subject.`,
    nullable: true,
  })
  scope!: string | null;

  @Field(() => ID, {
    description: `A task of the plan to draft a commit message for. Omit for the branch and PR only.`,
    nullable: true,
  })
  taskId!: string | null;
}
