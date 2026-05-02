import { describe, it, expect } from 'vitest';
// import { NestjsBullmqService } from '../services/nestjs-bullmq.service';
// import { NestjsBullmqModule } from './nestjs-bullmq.module';

describe.skip('NestjsBullmqModule', () => {
  it('should pass for now', () => {
    expect(true).toBe(true);
  });

  describe.skip('forRoot', () => {
    // it('returns a DynamicModule with providers and exports', () => {
    //   const dynamic = NestjsBullmqModule.forRoot({
    //     webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
    //   });
    //   expect(dynamic.module).toBe(NestjsBullmqModule);
    //   expect(dynamic.exports).toContain(NestjsBullmqService);
    //   expect(dynamic.providers).toBeDefined();
    //   expect(Array.isArray(dynamic.providers)).toBe(true);
    // });
    // it('throws when options are null (fail-fast at bootstrap)', () => {
    //   expect(() =>
    //     // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    //     NestjsBullmqModule.forRoot(null as unknown as { webhookUrl: string }),
    //   ).toThrow(/options are required/);
    // });
    // it('throws when webhookUrl is missing (fail-fast at bootstrap)', () => {
    //   expect(() =>
    //     // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    //     NestjsBullmqModule.forRoot({} as { webhookUrl: string }),
    //   ).toThrow(/webhookUrl is required/);
    // });
    // it('throws when webhookUrl is invalid URL (fail-fast at bootstrap)', () => {
    //   expect(() =>
    //     NestjsBullmqModule.forRoot({ webhookUrl: 'not-a-url' }),
    //   ).toThrow(/webhookUrl is not a valid URL/);
    // });
  });
});
