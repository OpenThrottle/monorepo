import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserEnvFileService } from '../../../services/user-env-file/user-env-file.service.ts';
import { UserEnvFileHealthResolver } from './user-env-file-health.resolver.ts';

describe('UserEnvFileHealthResolver', () => {
  let resolver: UserEnvFileHealthResolver;
  const logger = { warn: vi.fn() };
  const service = { getHealth: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        UserEnvFileHealthResolver,
        { provide: LoggerService, useValue: logger },
        { provide: UserEnvFileService, useValue: service },
      ],
    }).compile();
    resolver = app.get(UserEnvFileHealthResolver);
  });

  describe('when the service answers', () => {
    it('returns its statuses', async () => {
      service.getHealth.mockResolvedValue({ endpoint: 'ok', token: 'stale' });

      await expect(resolver.userEnvFile()).resolves.toEqual({
        endpoint: 'ok',
        token: 'stale',
      });
    });
  });

  describe('when the service throws', () => {
    it('returns null and warns instead of failing serverHealth', async () => {
      service.getHealth.mockRejectedValue(new Error('db down'));

      await expect(resolver.userEnvFile()).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
