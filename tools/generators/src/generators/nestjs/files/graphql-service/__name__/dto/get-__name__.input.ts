import { Field, ArgsType } from '@nestjs/graphql';
import { UUIDResolver } from 'graphql-scalars';
import { PaginationArgs } from '@openthrottle/nestjs-core/src/dto/pagination.args';

@ArgsType()
export class Get<%= namePascal %>Args extends PaginationArgs {
  @Field(() => UUIDResolver, { nullable: true })
  uuid?: string;

  // TODO: Add the fields needed for your application
}
