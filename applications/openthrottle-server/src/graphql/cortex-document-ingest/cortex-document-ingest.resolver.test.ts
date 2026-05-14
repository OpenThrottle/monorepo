/**
 * @description Unit tests for {@link CortexDocumentIngestResolver}.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CortexDocumentIngestService } from '../../services/cortex-document-ingest/cortex-document-ingest.service';
import { CortexDocumentIngestResolver } from './cortex-document-ingest.resolver';

describe('CortexDocumentIngestResolver', () => {
  let resolver: CortexDocumentIngestResolver;

  const mockIngestService = createMock<CortexDocumentIngestService>({
    commitIngest: vi.fn(),
    previewIngest: vi.fn(),
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CortexDocumentIngestResolver,
        { provide: CortexDocumentIngestService, useValue: mockIngestService },
      ],
    }).compile();

    resolver = moduleRef.get(CortexDocumentIngestResolver);
  });

  describe('previewCortexDocumentIngest', () => {
    test('maps service result to GraphQL object', async () => {
      vi.mocked(mockIngestService.previewIngest).mockResolvedValueOnce({
        detectedFormat: 'markdown',
        errorCode: undefined,
        errorMessage: undefined,
        planTitleSuggested: 'P',
        proposedTasksJson: '[]',
        success: true,
      });

      const result = await resolver.previewCortexDocumentIngest({
        fileBase64: 'YQ==',
        mimeType: null,
        originalFilename: null,
      });

      expect(mockIngestService.previewIngest).toHaveBeenCalledWith({
        fileBase64: 'YQ==',
        mimeType: undefined,
        originalFilename: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.detectedFormat).toBe('markdown');
      expect(result.planTitleSuggested).toBe('P');
    });
  });

  describe('commitCortexDocumentIngest', () => {
    test('maps tasks with requirementsJson', async () => {
      vi.mocked(mockIngestService.commitIngest).mockResolvedValueOnce({
        error: null,
        plan: {
          assignee: null,
          author: 'a',
          category: 'c',
          createdAt: new Date(),
          description: null,
          id: 'plan-1',
          project: null,
          projectId: null,
          status: 'PENDING',
          summary: null,
          title: 'T',
          updatedAt: new Date(),
        },
        success: true,
        tasks: [
          {
            assignee: null,
            category: null,
            createdAt: new Date(),
            description: null,
            id: 'task-1',
            planId: 'plan-1',
            project: null,
            projectId: null,
            requirements: ['r1'],
            status: 'PENDING',
            summary: null,
            title: 'One',
            updatedAt: new Date(),
          },
        ],
      });

      const result = await resolver.commitCortexDocumentIngest({
        fileBase64: 'YQ==',
        mimeType: null,
        originalFilename: null,
        plan: {
          assignee: null,
          author: 'a',
          category: 'c',
          description: null,
          project: null,
          projectId: null,
          status: 'PENDING',
          summary: null,
          title: 'T',
        },
      });

      expect(result.success).toBe(true);
      expect(result.tasks[0]?.requirementsJson).toBe('["r1"]');
    });
  });
});
