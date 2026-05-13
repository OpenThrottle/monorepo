import { BadRequestException, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';
import { CortexDocumentParseService } from '../cortex-document-parse/cortex-document-parse.service';
import { PlanCreationService } from '../plan-creation/plan-creation.service';
import { mapParseTreeToIngestDraft } from './cortex-document-ingest.mapper';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface PreviewCortexDocumentIngestParams {
  readonly fileBase64: string;
  readonly mimeType: string | undefined;
  readonly originalFilename: string | undefined;
}

export interface PreviewCortexDocumentIngestResult {
  readonly detectedFormat: string | undefined;
  readonly errorCode: string | undefined;
  readonly errorMessage: string | undefined;
  readonly planTitleSuggested: string | undefined;
  readonly proposedTasksJson: string | undefined;
  readonly success: boolean;
}

export interface CommitCortexDocumentIngestParams extends PreviewCortexDocumentIngestParams {
  readonly plan: CreatePlanInput;
}

export interface CommitCortexDocumentIngestResult {
  readonly error: string | null;
  readonly plan: Plan | null;
  readonly success: boolean;
  readonly tasks: readonly Task[];
}

/**
 * @description Parses uploaded document bytes and creates a plan plus tasks using the same persistence rules as {@link PlanCreationService.createPlanFromInput} and GraphQL `createTask`.
 */
@Injectable()
export class CortexDocumentIngestService {
  private readonly logContext = CortexDocumentIngestService.name;

  constructor(
    private readonly cortexDocumentParseService: CortexDocumentParseService,
    private readonly logger: LoggerService,
    private readonly planCreationService: PlanCreationService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    this.logger.debug('Cortex document ingest service ready', this.logContext);
  }

  /**
   * @description Parses base64 file content and returns suggested plan title and proposed tasks as JSON (no writes).
   */
  async previewIngest(
    params: PreviewCortexDocumentIngestParams,
  ): Promise<PreviewCortexDocumentIngestResult> {
    const buffer = this.decodeUpload(params.fileBase64);
    const parsed = this.cortexDocumentParseService.parseUpload(buffer, {
      mimeType: params.mimeType,
      originalFilename: params.originalFilename,
    });

    if (!parsed.ok) {
      return {
        detectedFormat: parsed.error.format ?? undefined,
        errorCode: parsed.error.code,
        errorMessage: parsed.error.message,
        planTitleSuggested: undefined,
        proposedTasksJson: undefined,
        success: false,
      };
    }

    const draft = mapParseTreeToIngestDraft(parsed.value);

    return {
      detectedFormat: parsed.value.format,
      errorCode: undefined,
      errorMessage: undefined,
      planTitleSuggested: draft.planTitle,
      proposedTasksJson: JSON.stringify(draft.proposedTasks),
      success: true,
    };
  }

  /**
   * @description Parses the upload, creates a plan from {@link CreatePlanInput} (title falls back to parsed plan title when blank), then creates tasks; deletes the plan on partial task failure (cascade removes any tasks already saved).
   */
  async commitIngest(
    params: CommitCortexDocumentIngestParams,
  ): Promise<CommitCortexDocumentIngestResult> {
    const buffer = this.decodeUpload(params.fileBase64);
    const parsed = this.cortexDocumentParseService.parseUpload(buffer, {
      mimeType: params.mimeType,
      originalFilename: params.originalFilename,
    });

    if (!parsed.ok) {
      return {
        error: parsed.error.message,
        plan: null,
        success: false,
        tasks: [],
      };
    }

    const draft = mapParseTreeToIngestDraft(parsed.value);
    const titleFromInput = params.plan.title?.trim() ?? '';
    const resolvedTitle =
      titleFromInput !== '' ? titleFromInput : draft.planTitle;

    const planInput: CreatePlanInput = {
      ...params.plan,
      title: resolvedTitle,
    };

    const createdPlan =
      await this.planCreationService.createPlanFromInput(planInput);

    let savedTasks: Task[] = [];

    try {
      const repo = this.tasksService.getRepository();
      const toSave = draft.proposedTasks.map((t) =>
        repo.create({
          assignee: null,
          category: null,
          description: t.description,
          planId: createdPlan.id,
          project: planInput.project ?? null,
          projectId: planInput.projectId ?? null,
          requirements: [...t.requirements],
          status: 'PENDING',
          summary: null,
          title: t.title,
        }),
      );
      savedTasks = await repo.save(toSave);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.logContext}: task create failed, rolling back plan ${createdPlan.id}: ${message}`,
      );
      await this.plansService.getRepository().delete({ id: createdPlan.id });
      return {
        error: message,
        plan: null,
        success: false,
        tasks: [],
      };
    }

    return {
      error: null,
      plan: createdPlan,
      success: true,
      tasks: savedTasks,
    };
  }

  private decodeUpload(fileBase64: string): Buffer {
    const trimmed = fileBase64.trim();
    if (trimmed === '') {
      throw new BadRequestException('fileBase64 is required.');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(trimmed, 'base64');
    } catch {
      throw new BadRequestException('fileBase64 is not valid base64.');
    }

    if (buffer.length === 0) {
      throw new BadRequestException('Decoded upload is empty.');
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `Decoded upload exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes.`,
      );
    }

    return buffer;
  }
}
