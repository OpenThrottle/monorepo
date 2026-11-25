/**
 * @description GraphQL ObjectType for a resolved id reference: a plan or task
 * that a short id fragment or full UUID resolved to, with just enough to render
 * a ⌘K row (title, status) and to navigate (task rows carry their plan).
 */

import { Field, ObjectType } from '@nestjs/graphql';

import type { IdRefKindValue } from './id-refs.enum.ts';
import { ID_REF_KIND } from './id-refs.enum.ts';

@ObjectType()
export class IdRefObject {
  @Field(() => String, {
    description: `Full UUID of the plan or task the ref resolved to.`,
  })
  id!: string;

  @Field(() => ID_REF_KIND, {
    description: `Whether this ref is a plan or a task.`,
  })
  kind!: IdRefKindValue;

  @Field(() => String, {
    description: `Owning plan id for a TASK ref; null for a PLAN ref.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => String, {
    description: `Owning plan title for a TASK ref; null for a PLAN ref.`,
    nullable: true,
  })
  planTitle!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  title!: string;
}
