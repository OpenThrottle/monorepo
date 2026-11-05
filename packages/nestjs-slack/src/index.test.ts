import { describe, expect, it } from 'vitest';

import { NestjsSlackError } from './config/nestjs-slack.error.ts';
import * as entrypoint from './index.ts';
import { NestjsSlackModule } from './modules/nestjs-slack.module.ts';
import { NestjsSlackService } from './services/nestjs-slack.service.ts';

// Merge-queue probe B (OT plan 10e17c59). Safe to revert.
const QUEUE_PROBE = 'b';

describe('merge-queue probe b', () => {
  it('runs inside the queue', () => {
    expect(QUEUE_PROBE).toBe('b');
  });
});

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
