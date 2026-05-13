/**
 * @description Unit tests for {@link CortexDocumentIngestService}.
 */

import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';
import { DOCUMENT_UPLOAD_FORMATS } from '../cortex-document-parse/cortex-document-parse.types';
import { CortexDocumentParseService } from '../cortex-document-parse/cortex-document-parse.service';
import { PlanCreationService } from '../plan-creation/plan-creation.service';
import { CortexDocumentIngestService } from './cortex-document-ingest.service';

describe('CortexDocumentIngestService', () => {
  let service: CortexDocumentIngestService;

  const mockParseService = {
    parseUpload: vi.fn(),
  };

  const mockLogger = {
    debug: vi.fn(),
    warn: vi.fn(),
  };

  const mockPlanCreation = {
    createPlanFromInput: vi.fn(),
  };

  const mockPlansRepo = {
    delete: vi.fn(),
  };

  const mockPlansService = {
    getRepository: vi.fn(() => mockPlansRepo),
  };

  const mockTasksRepo = {
    create: vi.fn((row: object) => row),
    save: vi.fn(),
  };

  const mockTasksService = {
    getRepository: vi.fn(() => mockTasksRepo),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CortexDocumentIngestService,
        { provide: CortexDocumentParseService, useValue: mockParseService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: PlanCreationService, useValue: mockPlanCreation },
        { provide: PlansService, useValue: mockPlansService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    service = moduleRef.get(CortexDocumentIngestService);
  });

  describe('previewIngest', () => {
    describe('when parsing fails', () => {
      test('returns success false with error fields', async () => {
        mockParseService.parseUpload.mockReturnValue({
          error: {
            code: 'FORMAT_UNSUPPORTED',
            detail: undefined,
            format: undefined,
            message: 'Unsupported',
          },
          ok: false,
        });

        const result = await service.previewIngest({
          fileBase64: Buffer.from('x').toString('base64'),
          mimeType: undefined,
          originalFilename: undefined,
        });

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('FORMAT_UNSUPPORTED');
        expect(result.errorMessage).toBe('Unsupported');
      });
    });

    describe('when parsing succeeds', () => {
      test('returns suggested title and tasks JSON', async () => {
        mockParseService.parseUpload.mockReturnValue({
          ok: true,
          value: {
            blocks: [{ kind: 'heading', level: 1, text: 'My plan' }],
            format: DOCUMENT_UPLOAD_FORMATS.markdown,
          },
        });

        const result = await service.previewIngest({
          fileBase64: Buffer.from('# My plan').toString('base64'),
          mimeType: 'text/markdown',
          originalFilename: 'a.md',
        });

        expect(result.success).toBe(true);
        expect(result.planTitleSuggested).toBe('My plan');
        expect(result.proposedTasksJson).toContain('Imported task');
      });
    });
  });

  describe('commitIngest', () => {
    const planInput: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'test',
      description: null,
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: ' ',
    };

    describe('when parsing fails', () => {
      test('returns success false without creating a plan', async () => {
        mockParseService.parseUpload.mockReturnValue({
          error: {
            code: 'EMPTY_DOCUMENT',
            detail: undefined,
            format: DOCUMENT_UPLOAD_FORMATS.markdown,
            message: 'Empty',
          },
          ok: false,
        });

        const result = await service.commitIngest({
          fileBase64: Buffer.from('x').toString('base64'),
          mimeType: undefined,
          originalFilename: 'x.md',
          plan: { ...planInput, title: 'ignored' },
        });

        expect(result.success).toBe(false);
        expect(mockPlanCreation.createPlanFromInput).not.toHaveBeenCalled();
      });
    });

    describe('when task save fails after plan create', () => {
      test('deletes the plan and returns an error', async () => {
        mockParseService.parseUpload.mockReturnValue({
          ok: true,
          value: {
            blocks: [
              { kind: 'heading', level: 1, text: 'T' },
              { kind: 'heading', level: 2, text: 'One' },
            ],
            format: DOCUMENT_UPLOAD_FORMATS.markdown,
          },
        });

        const createdPlan = { id: 'plan-1' } as Plan;
        mockPlanCreation.createPlanFromInput.mockResolvedValue(createdPlan);
        mockTasksRepo.save.mockRejectedValueOnce(new Error('db down'));

        const result = await service.commitIngest({
          fileBase64: Buffer.from('x').toString('base64'),
          mimeType: undefined,
          originalFilename: undefined,
          plan: planInput,
        });

        expect(result.success).toBe(false);
        expect(mockPlansRepo.delete).toHaveBeenCalledWith({ id: 'plan-1' });
        expect(mockLogger.warn).toHaveBeenCalled();
        const warnMsg = String(mockLogger.warn.mock.calls[0]?.[0] ?? '');
        expect(warnMsg).toContain('rolling back plan');
        expect(warnMsg).toContain('plan-1');
      });
    });

    describe('when commit succeeds', () => {
      test('returns plan and tasks', async () => {
        mockParseService.parseUpload.mockReturnValue({
          ok: true,
          value: {
            blocks: [
              { kind: 'heading', level: 1, text: 'T' },
              { kind: 'heading', level: 2, text: 'One' },
            ],
            format: DOCUMENT_UPLOAD_FORMATS.markdown,
          },
        });

        const createdPlan = { id: 'plan-1', title: 'T' } as Plan;
        const savedTask = {
          id: 'task-1',
          planId: 'plan-1',
          requirements: [],
          title: 'One',
        } as Task;

        mockPlanCreation.createPlanFromInput.mockResolvedValue(createdPlan);
        mockTasksRepo.save.mockResolvedValueOnce([savedTask]);

        const result = await service.commitIngest({
          fileBase64: Buffer.from('x').toString('base64'),
          mimeType: undefined,
          originalFilename: undefined,
          plan: planInput,
        });

        expect(result.success).toBe(true);
        expect(result.plan?.id).toBe('plan-1');
        expect(result.tasks).toHaveLength(1);
      });
    });
  });

  describe('decodeUpload validation', () => {
    describe('when fileBase64 is empty', () => {
      test('throws BadRequestException', async () => {
        await expect(
          service.previewIngest({
            fileBase64: '   ',
            mimeType: undefined,
            originalFilename: undefined,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });
  });
});
