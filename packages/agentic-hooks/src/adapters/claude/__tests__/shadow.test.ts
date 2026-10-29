import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isShadowedByRepoHooks } from '../shadow.ts';

describe('isShadowedByRepoHooks', () => {
  let repoRoot: string;
  const pluginRoot = '/plugins/openthrottle';
  const pluginScript = `${pluginRoot}/hooks/skill-usage-capture.cjs`;

  const writeSettings = (contents: string): void => {
    fs.mkdirSync(path.join(repoRoot, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.claude', 'settings.json'), contents);
  };

  const registered = JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          hooks: [{ command: './.claude/hooks/skill-usage-capture.cjs' }],
          matcher: 'Skill',
        },
      ],
    },
  });

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shadow-'));
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { force: true, recursive: true });
  });

  describe('when the plugin copy runs in a repo that registers capture', () => {
    it('stands down', () => {
      writeSettings(registered);
      expect(
        isShadowedByRepoHooks({
          env: { CLAUDE_PLUGIN_ROOT: pluginRoot },
          repoRoot,
          scriptPath: pluginScript,
        }),
      ).toBe(true);
    });
  });

  describe('when the repo copy itself runs', () => {
    it('captures', () => {
      writeSettings(registered);
      expect(
        isShadowedByRepoHooks({
          env: {},
          repoRoot,
          scriptPath: path.join(
            repoRoot,
            '.claude/hooks/skill-usage-capture.cjs',
          ),
        }),
      ).toBe(false);
    });
  });

  describe('when the repo registers no capture hook', () => {
    it('lets the plugin capture', () => {
      writeSettings(JSON.stringify({ hooks: {} }));
      expect(
        isShadowedByRepoHooks({
          env: { CLAUDE_PLUGIN_ROOT: pluginRoot },
          repoRoot,
          scriptPath: pluginScript,
        }),
      ).toBe(false);
    });
  });

  describe('when the repo settings are not strict JSON', () => {
    it('lets the plugin capture, because Claude Code drops that file', () => {
      writeSettings(`{\n  // comment\n${registered.slice(1)}`);
      expect(
        isShadowedByRepoHooks({
          env: { CLAUDE_PLUGIN_ROOT: pluginRoot },
          repoRoot,
          scriptPath: pluginScript,
        }),
      ).toBe(false);
    });
  });

  describe('when there are no repo settings', () => {
    it('lets the plugin capture', () => {
      expect(
        isShadowedByRepoHooks({
          env: { CLAUDE_PLUGIN_ROOT: pluginRoot },
          repoRoot,
          scriptPath: pluginScript,
        }),
      ).toBe(false);
    });
  });
});
