import { describe, it, expect } from 'vitest';
import { NestjsSlackService } from '../services/nestjs-slack.service';
import { NestjsSlackModule } from './nestjs-slack.module';

describe('NestjsSlackModule', () => {
  describe('forRoot', () => {
    it('returns a DynamicModule with providers and exports', () => {
      const dynamic = NestjsSlackModule.forRoot({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      });
      expect(dynamic.module).toBe(NestjsSlackModule);
      expect(dynamic.exports).toContain(NestjsSlackService);
      expect(dynamic.providers).toBeDefined();
      expect(Array.isArray(dynamic.providers)).toBe(true);
    });

    it('throws when options are null (fail-fast at bootstrap)', () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        NestjsSlackModule.forRoot(null as unknown as { webhookUrl: string }),
      ).toThrow(/options are required/);
    });

    it('throws when webhookUrl is missing (fail-fast at bootstrap)', () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        NestjsSlackModule.forRoot({} as { webhookUrl: string }),
      ).toThrow(/webhookUrl is required/);
    });

    it('throws when webhookUrl is invalid URL (fail-fast at bootstrap)', () => {
      expect(() =>
        NestjsSlackModule.forRoot({ webhookUrl: 'not-a-url' }),
      ).toThrow(/webhookUrl is not a valid URL/);
    });
  });
});
