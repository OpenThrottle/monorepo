/**
 * @description GraphQL inputs for tag→action rule CRUD.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class UpsertTagActionRuleInput {
  @Field(() => ID, {
    description: `When present, updates the existing rule (must belong to the caller).`,
    nullable: true,
  })
  id?: string | null;

  @Field(() => ID, {
    deprecationReason: `Reserved for cross-repo Projects; use repositoryId`,
    description: `Reserved for cross-repo Projects; not matched today.`,
    nullable: true,
  })
  projectId?: string | null;

  @Field(() => ID, {
    description: `Optional repository scope; null matches plans in every repository.`,
    nullable: true,
  })
  repositoryId?: string | null;

  @Field(() => String, {
    description: `Human-readable label for the rule (required, non-empty).`,
  })
  title!: string;

  @Field(() => [String], {
    defaultValue: [],
    description: `Tags that must ALL be present (AND); empty matches every plan.`,
  })
  tagAll?: string[];

  @Field(() => String, {
    description: `Optional plan-status qualifier (e.g. PENDING).`,
    nullable: true,
  })
  status?: string | null;

  @Field(() => String, {
    description: `Optional environment qualifier: ci | interactive | ralph.`,
    nullable: true,
  })
  environment?: string | null;

  @Field(() => String, {
    description: `Action type: "inject-task", "availability-exception", "promote-task-to-plan" or "attach-prompt".`,
  })
  actionType!: string;

  @Field(() => String, {
    description: `JSON-encoded action payload (validated per action type).`,
  })
  actionPayloadJson!: string;

  @Field(() => Boolean, { defaultValue: true, nullable: true })
  enabled?: boolean;
}

@InputType()
export class DeleteTagActionRuleInput {
  @Field(() => ID, {
    description: `Rule to soft delete (its ledger rows are kept).`,
  })
  id!: string;
}
