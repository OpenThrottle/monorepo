import { describe, expect, it } from 'vitest';

import {
  AGENT_ENV_PASSTHROUGH_ENV,
  buildAllowlistedChildEnv,
  parseAgentEnvPassthrough,
} from '../child-env.ts';

const NO_HOST_ENV = { keys: [], prefixes: [] } as const;

describe('parseAgentEnvPassthrough', () => {
  describe('when the value is unset or blank', () => {
    it('admits nothing', () => {
      expect(parseAgentEnvPassthrough(undefined)).toEqual({
        names: [],
        refused: [],
      });
      expect(parseAgentEnvPassthrough('  ,  ')).toEqual({
        names: [],
        refused: [],
      });
    });
  });

  describe('when the value names variables', () => {
    it('splits on commas and whitespace', () => {
      expect(
        parseAgentEnvPassthrough('GH_TOKEN, NX_DAEMON\nHTTPS_PROXY').names,
      ).toEqual(['GH_TOKEN', 'NX_DAEMON', 'HTTPS_PROXY']);
    });
  });

  describe('when an entry is a wildcard or malformed', () => {
    it('refuses it', () => {
      expect(parseAgentEnvPassthrough('NX_*,*,A-B,GH_TOKEN')).toEqual({
        names: ['GH_TOKEN'],
        refused: ['NX_*', '*', 'A-B'],
      });
    });
  });
});

describe('buildAllowlistedChildEnv', () => {
  const hostEnv = {
    CURSOR_API_KEY: 'cursor-key',
    GH_TOKEN: 'gh',
    HOME: '/home/agent',
    PATH: '/usr/bin',
    POSTGRES_PASSWORD: 'secret',
    UNSET: undefined,
    XAI_API_KEY: 'xai',
  };

  describe('when no driver keys, passthrough or extras are given', () => {
    it('admits only the base keys and reports the rest by name', () => {
      const result = buildAllowlistedChildEnv({
        extras: undefined,
        hostEnv,
        hostEnvPolicy: NO_HOST_ENV,
      });

      expect(result.env).toEqual({ HOME: '/home/agent', PATH: '/usr/bin' });
      expect(result.dropped).toEqual([
        'CURSOR_API_KEY',
        'GH_TOKEN',
        'POSTGRES_PASSWORD',
        'XAI_API_KEY',
      ]);
    });
  });

  describe('when the driver declares host keys and prefixes', () => {
    it('admits them', () => {
      const result = buildAllowlistedChildEnv({
        extras: undefined,
        hostEnv,
        hostEnvPolicy: { keys: ['XAI_API_KEY'], prefixes: ['CURSOR_'] },
      });

      expect(result.env).toMatchObject({
        CURSOR_API_KEY: 'cursor-key',
        XAI_API_KEY: 'xai',
      });
      expect(result.env.POSTGRES_PASSWORD).toBeUndefined();
    });
  });

  describe('when the install passes names through', () => {
    it('admits exact names and reports refused wildcards', () => {
      const result = buildAllowlistedChildEnv({
        extras: undefined,
        hostEnv: {
          ...hostEnv,
          [AGENT_ENV_PASSTHROUGH_ENV]: 'GH_TOKEN,POSTGRES_*',
        },
        hostEnvPolicy: NO_HOST_ENV,
      });

      expect(result.env.GH_TOKEN).toBe('gh');
      expect(result.env.POSTGRES_PASSWORD).toBeUndefined();
      expect(result.refusedPassthrough).toEqual(['POSTGRES_*']);
    });
  });

  describe('when the run passes extras', () => {
    it('layers them over the host values and does not report them dropped', () => {
      const result = buildAllowlistedChildEnv({
        extras: { HOME: '/override', POSTGRES_PASSWORD: '' },
        hostEnv,
        hostEnvPolicy: NO_HOST_ENV,
      });

      expect(result.env).toMatchObject({
        HOME: '/override',
        POSTGRES_PASSWORD: '',
      });
      expect(result.dropped).not.toContain('POSTGRES_PASSWORD');
    });
  });
});
