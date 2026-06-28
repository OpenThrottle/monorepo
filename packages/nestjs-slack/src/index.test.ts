import { describe, it, expect } from 'vitest';
import * as entrypoint from './index';
import { NestjsSlackError } from './config/nestjs-slack.error';
import { NestjsSlackModule } from './modules/nestjs-slack.module';
import { NestjsSlackService } from './services/nestjs-slack.service';

describe('@openthrottle/nestjs-slack entrypoint', () => {
  it('re-exports NestjsSlackModule', () => {
    expect(entrypoint.NestjsSlackModule).toBe(NestjsSlackModule);
  });

  it('re-exports NestjsSlackService', () => {
    expect(entrypoint.NestjsSlackService).toBe(NestjsSlackService);
  });

  it('re-exports NestjsSlackError', () => {
    expect(entrypoint.NestjsSlackError).toBe(NestjsSlackError);
  });

  it('exposes exactly the documented public runtime surface', () => {
    expect(Object.keys(entrypoint).sort()).toEqual([
      'NestjsSlackError',
      'NestjsSlackModule',
      'NestjsSlackService',
    ]);
  });
});
