/**
 * @description GraphQL ObjectType for User. Public API omits passwordHash; shape otherwise matches {@link UserData} from @openthrottle/nestjs-repositories.
 */

import type { UserData } from '@openthrottle/nestjs-repositories';
import { Field, ObjectType } from '@nestjs/graphql';

/** Public user fields (excludes passwordHash). */
type PublicUserData = Omit<UserData, 'passwordHash'>;

@ObjectType()
export class UserObject implements PublicUserData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, {
    description: `When set, user is disabled and cannot log in.`,
    nullable: true,
  })
  disabledAt!: Date | null;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, {
    description: `GitHub user or Organization name (e.g. OpenThrottle)`,
  })
  githubUsername!: string;

  @Field(() => String)
  id!: string;

  @Field(() => Date)
  updatedAt!: Date;
}
