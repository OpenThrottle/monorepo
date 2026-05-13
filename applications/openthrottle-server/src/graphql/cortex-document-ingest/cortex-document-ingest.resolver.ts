/**
 * @description GraphQL mutations to preview and commit Cortex document uploads into plans and tasks.
 */

import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { CortexDocumentIngestService } from '../../services/cortex-document-ingest/cortex-document-ingest.service';
import {
  CommitCortexDocumentIngestInput,
  PreviewCortexDocumentIngestInput,
} from './cortex-document-ingest.input';
import {
  CommitCortexDocumentIngestResultObject,
  PreviewCortexDocumentIngestResultObject,
} from './cortex-document-ingest.object';
import { TaskObject } from '../tasks/task.object';

@Resolver()
export class CortexDocumentIngestResolver {
  constructor(
    private readonly cortexDocumentIngestService: CortexDocumentIngestService,
  ) {}

  @Mutation(() => PreviewCortexDocumentIngestResultObject, {
    description: `Parse an uploaded document and return a suggested plan title and proposed tasks JSON without persisting.`,
  })
  async previewCortexDocumentIngest(
    @Args('input', { type: () => PreviewCortexDocumentIngestInput })
    input: PreviewCortexDocumentIngestInput,
  ): Promise<PreviewCortexDocumentIngestResultObject> {
    const result = await this.cortexDocumentIngestService.previewIngest({
      fileBase64: input.fileBase64,
      mimeType: input.mimeType ?? undefined,
      originalFilename: input.originalFilename ?? undefined,
    });

    return {
      detectedFormat: result.detectedFormat ?? null,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
      planTitleSuggested: result.planTitleSuggested ?? null,
      proposedTasksJson: result.proposedTasksJson ?? null,
      success: result.success,
    };
  }

  @Mutation(() => CommitCortexDocumentIngestResultObject, {
    description: `Parse an uploaded document, create a plan using the same rules as createPlan, then create tasks using the same fields as createTask. Rolls back the plan if any task insert fails.`,
  })
  @EmitNotification(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, (ret) => {
    const payload = ret as CommitCortexDocumentIngestResultObject | undefined;
    if (payload == null || !payload.success || payload.plan == null) {
      return null;
    }
    return {
      message: `Plan created from document: ${payload.plan.title}`,
      planId: payload.plan.id,
      severity: 'success' as const,
    };
  })
  async commitCortexDocumentIngest(
    @Args('input', { type: () => CommitCortexDocumentIngestInput })
    input: CommitCortexDocumentIngestInput,
  ): Promise<CommitCortexDocumentIngestResultObject> {
    const result = await this.cortexDocumentIngestService.commitIngest({
      fileBase64: input.fileBase64,
      mimeType: input.mimeType ?? undefined,
      originalFilename: input.originalFilename ?? undefined,
      plan: input.plan,
    });

    const tasks: TaskObject[] = result.tasks.map((t) => ({
      ...t,
      plan: null,
      projectRelation: null,
      requirementsJson: JSON.stringify(t.requirements ?? []),
    })) as TaskObject[];

    return {
      error: result.error,
      plan: result.plan,
      success: result.success,
      tasks,
    };
  }
}
