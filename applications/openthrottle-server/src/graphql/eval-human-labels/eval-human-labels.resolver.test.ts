import { createMock } from '@golevelup/ts-vitest';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type { EvalHumanLabel } from '@openthrottle/nestjs-repositories';
import {
  EVAL_LABEL_VERDICT,
  EvalHumanLabelsService,
} from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EvalHumanLabelsResolver } from './eval-human-labels.resolver.ts';

const trajectoryId = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

const buildLabel = (
  overrides: Partial<EvalHumanLabel> = {},
): EvalHumanLabel => {
  return {
    createdAt: new Date('2026-11-05T08:00:00.000Z'),
    failureType: null,
    id: 'f1f2f3f4-0000-4000-8000-000000000001',
    note: null,
    rater: 'visormatt',
    trajectoryId,
    updatedAt: new Date('2026-11-05T08:00:00.000Z'),
    verdict: EVAL_LABEL_VERDICT.pass,
    ...overrides,
  };
};

const buildInput = (
  overrides: Partial<{
    failureType: string | null;
    note: string | null;
    verdict: string;
  }> = {},
) => {
  return {
    failureType: null,
    note: null,
    trajectoryId,
    verdict: 'pass',
    ...overrides,
  };
};

const mockService = createMock<EvalHumanLabelsService>({
  findByTrajectory: vi.fn(),
  remove: vi.fn(),
  upsert: vi.fn(),
});

const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

describe('EvalHumanLabelsResolver', () => {
  let resolver: EvalHumanLabelsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockCls.get).mockReturnValue({
      displayName: 'visormatt',
      email: 'visormatt@example.com',
      isDeleted: false,
      roles: [],
      uuid: 'u1',
    });

    const app = await Test.createTestingModule({
      providers: [
        EvalHumanLabelsResolver,
        { provide: EvalHumanLabelsService, useValue: mockService },
        { provide: GlobalClsService, useValue: mockCls },
      ],
    }).compile();

    resolver = app.get(EvalHumanLabelsResolver);
  });

  describe('labelAgentTrajectory', () => {
    test('stamps the rater from the identity and trims strings', async () => {
      vi.mocked(mockService.upsert).mockResolvedValue(
        buildLabel({ failureType: 'wrong-file', note: 'bad edit' }),
      );

      const result = await resolver.labelAgentTrajectory(
        buildInput({
          failureType: '  wrong-file ',
          note: ' bad edit\n',
          verdict: ' fail ',
        }),
        undefined,
      );

      expect(mockService.upsert).toHaveBeenCalledWith({
        failureType: 'wrong-file',
        note: 'bad edit',
        rater: 'visormatt',
        trajectoryId,
        verdict: 'fail',
      });
      expect(result.rater).toBe('visormatt');
    });

    test('falls back to the principal when there is no CLS user', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);
      vi.mocked(mockService.upsert).mockResolvedValue(buildLabel());

      await resolver.labelAgentTrajectory(buildInput(), {
        email: 'alice@example.com',
        kind: 'user',
        sub: 'sub-1',
      });

      expect(mockService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ rater: 'alice@example.com' }),
      );
    });

    test('stores blank failure type and note as null', async () => {
      vi.mocked(mockService.upsert).mockResolvedValue(buildLabel());

      await resolver.labelAgentTrajectory(
        buildInput({ failureType: '   ', note: '' }),
        undefined,
      );

      expect(mockService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ failureType: null, note: null }),
      );
    });

    test('accepts a note of exactly 4000 characters', async () => {
      vi.mocked(mockService.upsert).mockResolvedValue(buildLabel());

      await resolver.labelAgentTrajectory(
        buildInput({ note: 'a'.repeat(4000) }),
        undefined,
      );

      expect(mockService.upsert).toHaveBeenCalledTimes(1);
    });

    test('rejects a note over 4000 characters', async () => {
      await expect(
        resolver.labelAgentTrajectory(
          buildInput({ note: 'a'.repeat(4001) }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });

    test('rejects an unknown verdict', async () => {
      await expect(
        resolver.labelAgentTrajectory(
          buildInput({ verdict: 'maybe' }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });

    test('rejects a call with no resolvable identity', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await expect(
        resolver.labelAgentTrajectory(buildInput(), undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });

    test('maps a foreign key violation to NotFound', async () => {
      vi.mocked(mockService.upsert).mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('fk'), { code: '23503' }),
        ),
      );

      await expect(
        resolver.labelAgentTrajectory(buildInput(), undefined),
      ).rejects.toThrow(new NotFoundException('trajectory not found'));
    });

    test('lets other database errors propagate', async () => {
      const failure = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('serialization'), { code: '40001' }),
      );
      vi.mocked(mockService.upsert).mockRejectedValue(failure);

      await expect(
        resolver.labelAgentTrajectory(buildInput(), undefined),
      ).rejects.toBe(failure);
    });
  });

  describe('removeAgentTrajectoryLabel', () => {
    test('removes only the caller label', async () => {
      vi.mocked(mockService.remove).mockResolvedValue(true);

      const result = await resolver.removeAgentTrajectoryLabel(
        trajectoryId,
        undefined,
      );

      expect(mockService.remove).toHaveBeenCalledWith({
        rater: 'visormatt',
        trajectoryId,
      });
      expect(result).toBe(true);
    });

    test('returns false when the caller had no label', async () => {
      vi.mocked(mockService.remove).mockResolvedValue(false);

      expect(
        await resolver.removeAgentTrajectoryLabel(trajectoryId, undefined),
      ).toBe(false);
    });

    test('rejects a call with no resolvable identity', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await expect(
        resolver.removeAgentTrajectoryLabel(trajectoryId, undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockService.remove).not.toHaveBeenCalled();
    });
  });

  describe('agentTrajectoryLabels', () => {
    test('lists the trajectory labels', async () => {
      vi.mocked(mockService.findByTrajectory).mockResolvedValue([
        buildLabel(),
        buildLabel({ id: 'f1f2f3f4-0000-4000-8000-000000000002', rater: 'bo' }),
      ]);

      const result = await resolver.agentTrajectoryLabels(trajectoryId);

      expect(mockService.findByTrajectory).toHaveBeenCalledWith(trajectoryId);
      expect(result.map((label) => label.rater)).toEqual(['visormatt', 'bo']);
    });
  });
});
