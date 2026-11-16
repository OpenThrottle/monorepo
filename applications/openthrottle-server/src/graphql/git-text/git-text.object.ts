import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Branch, commit and PR text drafted from a plan and its tasks: conventional commits, the repo PR template, Plan-Id / Task-Id footers, and never a tool or model credit. A draft to edit, not to send blind.`,
})
export class GitTextDraftObject {
  @Field(() => String, {
    description: `A git-safe branch name: ot/<slug>-<plan id prefix>.`,
  })
  branchName!: string;

  @Field(() => String, {
    description: `The commit message for the requested task, footers included. Null when no taskId was given.`,
    nullable: true,
  })
  commitMessage!: string | null;

  @Field(() => String, {
    description: `The PR body on the repo template's headings. Testing keeps its TODO: the steps are the author's to write.`,
  })
  pullRequestBody!: string;

  @Field(() => String, {
    description: `A conventional-commit PR title for the plan.`,
  })
  pullRequestTitle!: string;
}
