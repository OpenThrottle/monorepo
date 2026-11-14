import { describe, expect, it } from 'vitest';

import {
  OWN_VOICE_COMPOSE_ARGS,
  parseVoiceAction,
  planVoiceAction,
  primaryVoiceArgs,
} from '../openthrottle-voice-lifecycle.ts';
import type { WorktreeDbMode } from '../utils/worktree-db.ts';

const WORKTREE_MODES: readonly WorktreeDbMode[] = ['isolated', 'shared'];

describe('planVoiceAction', () => {
  it("runs the primary checkout's original compose commands, byte for byte", () => {
    expect(planVoiceAction('start', 'primary')).toEqual({
      args: ['compose', '--profile', 'voice', 'up', '-d', '--wait', 'whisper'],
      kind: 'own-compose',
    });
    expect(planVoiceAction('stop', 'primary')).toEqual({
      args: ['compose', '--profile', 'voice', 'stop', 'whisper'],
      kind: 'own-compose',
    });
    expect(planVoiceAction('logs', 'primary')).toEqual({
      args: ['compose', '--profile', 'voice', 'logs', 'whisper', '-f'],
      kind: 'own-compose',
    });
  });

  it("starts and follows the primary's whisper from any worktree, shared or isolated", () => {
    for (const mode of WORKTREE_MODES) {
      expect(planVoiceAction('start', mode)).toEqual({
        kind: 'shared-primary',
        tail: ['up', '-d', '--wait', 'whisper'],
      });
      expect(planVoiceAction('logs', mode)).toEqual({
        kind: 'shared-primary',
        tail: ['logs', 'whisper', '-f'],
      });
    }
  });

  it('never stops the shared whisper from a worktree', () => {
    for (const mode of WORKTREE_MODES) {
      expect(planVoiceAction('stop', mode)).toEqual({
        kind: 'shared-stop-skipped',
      });
    }
  });
});

describe('primaryVoiceArgs', () => {
  it("pins compose to the primary's file, directory, project and the voice profile", () => {
    expect(
      primaryVoiceArgs('/repos/monorepo', 'openthrottle', ['up', '-d', '--wait', 'whisper']), // prettier-ignore
    ).toEqual([
      'compose',
      '-f',
      '/repos/monorepo/docker-compose.yml',
      '--project-directory',
      '/repos/monorepo',
      '-p',
      'openthrottle',
      '--profile',
      'voice',
      'up',
      '-d',
      '--wait',
      'whisper',
    ]);
  });

  it('keeps the primary commands identical to the old inline scripts', () => {
    expect(OWN_VOICE_COMPOSE_ARGS.start.join(' ')).toBe(
      'compose --profile voice up -d --wait whisper',
    );
  });
});

describe('parseVoiceAction', () => {
  it('accepts only start, stop and logs', () => {
    expect(parseVoiceAction('start')).toBe('start');
    expect(parseVoiceAction('stop')).toBe('stop');
    expect(parseVoiceAction('logs')).toBe('logs');
    expect(parseVoiceAction('down')).toBeUndefined();
    expect(parseVoiceAction(undefined)).toBeUndefined();
  });
});
