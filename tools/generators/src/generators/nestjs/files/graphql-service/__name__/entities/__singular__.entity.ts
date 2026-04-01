import { ObjectType, Field } from '@nestjs/graphql';
import { CacheControl } from 'nestjs-gql-cache-control';
import { BaseEntity } from '@openthrottle/nestjs-core/src/entities/base.entity';
// import { UUIDResolver } from 'graphql-scalars';

// @CacheControl({ inheritMaxAge: true, scope: 'PRIVATE' })
@ObjectType()
export class <%= singularPascal %> extends BaseEntity {
  // TODO: Add the fields needed for your application
  //
  // @Field(() => Boolean)
  // exBoolean: boolean;
  //
  // @Field(() => UUIDResolver, { nullable: true })
  // userId?: string;
}
