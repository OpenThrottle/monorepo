/**
 * @description Unit tests for development resolver: ping, websocket notification, and JSONL sample mutations.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { DevelopmentResolver } from './development.resolver';
import { DevelopmentService } from './development.service';

describe('DevelopmentResolver', () => {
  let resolver: DevelopmentResolver;

  const mockDevelopmentService = createMock<DevelopmentService>({
    ping: vi.fn(),
    triggerDevJsonlLogSample: vi.fn(),
    triggerWebsocketNotification: vi.fn(),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        DevelopmentResolver,
        { provide: DevelopmentService, useValue: mockDevelopmentService },
      ],
    }).compile();

    resolver = app.get<DevelopmentResolver>(DevelopmentResolver);
  });

  describe('developmentPing', () => {
    test('returns pong from DevelopmentService.ping', () => {
      vi.mocked(mockDevelopmentService.ping).mockReturnValueOnce('pong');

      const result = resolver.developmentPing();

      expect(mockDevelopmentService.ping).toHaveBeenCalledOnce();
      expect(result).toBe('pong');
    });
  });

  describe('triggerWebsocketNotification', () => {
    test('triggers notification and returns true', () => {
      const result = resolver.triggerWebsocketNotification();

      expect(
        mockDevelopmentService.triggerWebsocketNotification,
      ).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });
  });

  describe('triggerDevJsonlLogSample', () => {
    test('returns true when DevelopmentService succeeds', async () => {
      vi.mocked(
        mockDevelopmentService.triggerDevJsonlLogSample,
      ).mockResolvedValueOnce(true);

      const result = await resolver.triggerDevJsonlLogSample();

      expect(
        mockDevelopmentService.triggerDevJsonlLogSample,
      ).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });
  });
});
