/**
 * @description Deprecated: GraphQL input for the deprecated enqueueDocIngestion
 * mutation. Doc ingestion has been removed and the mutation ignores this input;
 * the type stays only for schema compatibility until the mutation is removed.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class EnqueueDocIngestionInput {
  @Field(() => [String], {
    description: `Paths relative to workspace root; each directory is expanded to all .md files (recursive).`,
    nullable: true,
  })
  directories!: string[] | null;

  @Field(() => [String], {
    description: 'Individual markdown file paths relative to workspace root.',
    nullable: true,
  })
  files!: string[] | null;

  @Field(() => String, {
    description: `Ingestion scope for prior-state (default: "default"). Use different scopes to keep state separate.`,
    nullable: true,
  })
  scope!: string | null;

  @Field(() => String, {
    description: 'Source repo for metadata (e.g. owner/repo).',
    nullable: true,
  })
  repo!: string | null;

  @Field(() => String, {
    description: 'Source commit SHA for metadata.',
    nullable: true,
  })
  sha!: string | null;
}
