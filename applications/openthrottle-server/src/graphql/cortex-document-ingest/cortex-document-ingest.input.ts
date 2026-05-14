/**
 * @description GraphQL inputs for Cortex document ingest preview and commit (base64 body matches other binary GraphQL surfaces such as Stripe webhook).
 */

import { Field, InputType } from '@nestjs/graphql';
import { CreatePlanInput } from '../plans/plan.input';

@InputType()
export class PreviewCortexDocumentIngestInput {
  @Field(() => String, {
    description: `File bytes encoded as standard base64 (no data: URL prefix).`,
  })
  fileBase64!: string;

  @Field(() => String, {
    description: `MIME type from the upload when known (e.g. text/markdown).`,
    nullable: true,
  })
  mimeType!: string | null;

  @Field(() => String, {
    description: `Original filename for format detection fallback.`,
    nullable: true,
  })
  originalFilename!: string | null;
}

@InputType()
export class CommitCortexDocumentIngestInput extends PreviewCortexDocumentIngestInput {
  @Field(() => CreatePlanInput, {
    description: `Same fields as createPlan. When title is blank or whitespace-only, the parser-suggested title from the document is used.`,
  })
  plan!: CreatePlanInput;
}
