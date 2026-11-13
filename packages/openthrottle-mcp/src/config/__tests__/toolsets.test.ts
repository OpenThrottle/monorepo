import { describe, expect, it } from 'vitest';

import { buildServerInstructions, SERVER_INSTRUCTIONS } from '../index.ts';
import type { ToolsetResolution } from '../toolsets.ts';
import {
  DEFAULT_TOOLSETS,
  disabledToolsets,
  parseToolsets,
  resolveToolsets,
  TOOLSET_NAMES,
  TOOLSETS_ENV,
} from '../toolsets.ts';

const enabledOf = (resolution: ToolsetResolution): string[] => {
  if (!resolution.ok) {
    throw new Error(`expected ok, got: ${resolution.error}`);
  }

  return [...resolution.toolsets].sort();
};

describe('parseToolsets', () => {
  describe('when nothing is configured', () => {
    it('enables only the default toolsets', () => {
      expect(enabledOf(parseToolsets(undefined))).toEqual([
        ...DEFAULT_TOOLSETS,
      ]);
      expect(enabledOf(parseToolsets(' , '))).toEqual([...DEFAULT_TOOLSETS]);
    });
  });

  describe('when toolsets are named', () => {
    it('adds them to core, ignoring case and whitespace', () => {
      expect(enabledOf(parseToolsets(' Blog , admin'))).toEqual([
        'admin',
        'blog',
        'core',
      ]);
    });
  });

  describe('when `all` is named', () => {
    it('enables every toolset', () => {
      expect(enabledOf(parseToolsets('all'))).toEqual([...TOOLSET_NAMES]);
    });
  });

  describe('when a name is unknown', () => {
    it('rejects the whole selection and lists the valid names', () => {
      const resolution = parseToolsets('blog,blgo');

      expect(resolution.ok).toBe(false);
      if (!resolution.ok) {
        expect(resolution.error).toContain('blgo');
        expect(resolution.error).toContain(TOOLSET_NAMES.join(', '));
      }
    });
  });
});

describe('resolveToolsets', () => {
  it('reads the environment variable when there is no flag', () => {
    expect(
      enabledOf(resolveToolsets([], { [TOOLSETS_ENV]: 'agents' })),
    ).toEqual(['agents', 'core']);
  });

  it('prefers --toolsets=<v> over the environment variable', () => {
    const resolution = resolveToolsets(['--toolsets=blog'], {
      [TOOLSETS_ENV]: 'admin',
    });

    expect(enabledOf(resolution)).toEqual(['blog', 'core']);
  });

  it('accepts --toolsets <v> as two arguments', () => {
    expect(enabledOf(resolveToolsets(['--toolsets', 'admin'], {}))).toEqual([
      'admin',
      'core',
    ]);
  });
});

describe('buildServerInstructions', () => {
  it('names every disabled toolset and how to enable it', () => {
    const instructions = buildServerInstructions(new Set(DEFAULT_TOOLSETS));

    expect(instructions.startsWith(SERVER_INSTRUCTIONS)).toBe(true);
    for (const name of disabledToolsets(new Set(DEFAULT_TOOLSETS))) {
      expect(instructions).toContain(name);
    }
    expect(instructions).toContain(TOOLSETS_ENV);
  });

  it('adds nothing when every toolset is enabled', () => {
    expect(buildServerInstructions(new Set(TOOLSET_NAMES))).toBe(
      SERVER_INSTRUCTIONS,
    );
  });
});
