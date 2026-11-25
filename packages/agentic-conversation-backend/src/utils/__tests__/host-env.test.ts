import {
  claudeDriver,
  cursorDriver,
  opencodeDriver,
} from '@openthrottle/openthrottle-drivers';
import { describe, expect, it } from 'vitest';

import { pickChatHostEnv } from '../host-env.ts';

const HOST_ENV: NodeJS.ProcessEnv = {
  ANTHROPIC_API_KEY: 'anthropic',
  CURSOR_API_KEY: 'cursor',
  HOME: '/home/u',
  PATH: '/usr/bin',
  POSTGRES_PASSWORD: 'secret',
  SHELL: '/bin/zsh',
};

describe('pickChatHostEnv', () => {
  describe('when the driver declares login keys', () => {
    it('admits the base keys and that driver keys only', () => {
      expect(pickChatHostEnv(HOST_ENV, claudeDriver.hostEnv)).toEqual({
        ANTHROPIC_API_KEY: 'anthropic',
        HOME: '/home/u',
        PATH: '/usr/bin',
      });
    });
  });

  describe('when the driver declares prefixes', () => {
    it('admits them, and keeps SHELL for cursor', () => {
      expect(pickChatHostEnv(HOST_ENV, cursorDriver.hostEnv)).toEqual({
        CURSOR_API_KEY: 'cursor',
        HOME: '/home/u',
        PATH: '/usr/bin',
        SHELL: '/bin/zsh',
      });
    });
  });

  describe('when the run passes extras', () => {
    it('layers them on top', () => {
      expect(
        pickChatHostEnv(HOST_ENV, opencodeDriver.hostEnv, { HOME: '/x' }),
      ).toEqual({ HOME: '/x', PATH: '/usr/bin' });
    });
  });
});
