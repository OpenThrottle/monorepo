import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findClaudeConfigPaths,
  isClaudeConfigPath,
  main,
  parseConfigFile,
} from '../check-claude-config-json.ts';
import { run } from '../utils/exec.ts';

describe('check-claude-config-json', () => {
  let repoRoot: string;

  const write = (path: string, contents: string): void => {
    const absolute = join(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  };

  const trackEverything = (): void => {
    run('git', ['-C', repoRoot, 'add', '--all']);
  };

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-claudejson-'));
    run('git', ['init', '--quiet', repoRoot]);
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  describe('isClaudeConfigPath', () => {
    it.each([
      '.claude/settings.json',
      '.claude/launch.json',
      '.mcp.json',
      '.claude-plugin/marketplace.json',
      'plugins/openthrottle/.claude-plugin/plugin.json',
      'plugins/openthrottle/hooks/hooks.json',
    ])('covers %s', (path) => {
      expect(isClaudeConfigPath(path)).toBe(true);
    });

    it.each([
      '.cursor/worktrees.json',
      '.vscode/mcp.json',
      '.claude/skills/x/data.json',
      'package.json',
    ])('ignores %s', (path) => {
      expect(isClaudeConfigPath(path)).toBe(false);
    });
  });

  describe('when a tracked settings file carries a comment', () => {
    it('fails and names the file', () => {
      write('.claude/settings.json', '{\n  // note\n  "hooks": {}\n}\n');
      trackEverything();

      expect(parseConfigFile(repoRoot, '.claude/settings.json')).toMatchObject({
        path: '.claude/settings.json',
      });
      expect(main(repoRoot)).toBe(1);
    });
  });

  describe('when every tracked config is strict JSON', () => {
    it('passes', () => {
      write('.claude/settings.json', '{ "hooks": {} }\n');
      write('plugins/p/hooks/hooks.json', '{ "hooks": {} }\n');
      trackEverything();

      expect(findClaudeConfigPaths(repoRoot)).toEqual([
        '.claude/settings.json',
        'plugins/p/hooks/hooks.json',
      ]);
      expect(main(repoRoot)).toBe(0);
    });
  });

  describe('when the broken file is untracked', () => {
    it('ignores it', () => {
      write('.claude/settings.local.json', '{ // local only\n}\n');

      expect(main(repoRoot)).toBe(0);
    });
  });
});
