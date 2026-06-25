import { afterEach, describe, expect, it } from 'vitest';
import { NestjsBullmqBoardModule } from './nestjs-bullmq-board.module';

describe('NestjsBullmqBoardModule', () => {
  describe('forRoot', () => {
    it('mounts nothing when disabled (default)', () => {
      const dynamic = NestjsBullmqBoardModule.forRoot();

      expect(dynamic.module).toBe(NestjsBullmqBoardModule);
      expect(dynamic.imports).toEqual([]);
    });

    it('mounts nothing when explicitly disabled', () => {
      const dynamic = NestjsBullmqBoardModule.forRoot({ enabled: false });

      expect(dynamic.module).toBe(NestjsBullmqBoardModule);
      expect(dynamic.imports).toEqual([]);
    });

    it('mounts the dashboard imports when enabled', () => {
      const dynamic = NestjsBullmqBoardModule.forRoot({ enabled: true });

      expect(dynamic.module).toBe(NestjsBullmqBoardModule);
      expect(Array.isArray(dynamic.imports)).toBe(true);
      expect(dynamic.imports?.length).toBe(3);
    });
  });

  describe('forFeature', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('returns a DynamicModule for the named queue when enabled', () => {
      process.env.NODE_ENV = 'development';

      const dynamic = NestjsBullmqBoardModule.forFeature('my-queue');

      expect(dynamic.module).toBeDefined();
      expect(Array.isArray(dynamic.providers)).toBe(true);
    });

    it('returns an empty module when disabled so it never injects bull_board_instance without a root', () => {
      process.env.NODE_ENV = 'production';

      const dynamic = NestjsBullmqBoardModule.forFeature('my-queue');

      expect(dynamic.module).toBe(NestjsBullmqBoardModule);
      expect(dynamic.providers).toBeUndefined();
    });
  });
});
