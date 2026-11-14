import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  detectClaudeBundleHost,
  resolveBundleHostProjectDir,
} from '../bundle-host.ts';

const HOME = path.resolve('/home/dev');
const CLAUDE_ROOT = path.join(
  HOME,
  '.claude/plugins/cache/openthrottle/openthrottle/1.3.0',
);
const CLAUDE_SCRIPT = path.join(CLAUDE_ROOT, 'hooks/skill-usage-heartbeat.cjs');

describe('detectClaudeBundleHost', () => {
  describe('when Claude Code runs its own plugin', () => {
    it('is claude-code, even with inherited Claude session variables', () => {
      expect(
        detectClaudeBundleHost({
          env: { CLAUDECODE: '1', CLAUDE_PLUGIN_ROOT: CLAUDE_ROOT },
          homeDir: HOME,
          scriptPath: CLAUDE_SCRIPT,
        }),
      ).toBe('claude-code');
    });
  });

  describe('when cursor-agent runs the Claude-installed plugin', () => {
    it('is cursor when both plugin roots agree and hold the script', () => {
      expect(
        detectClaudeBundleHost({
          env: {
            CLAUDE_PLUGIN_ROOT: CLAUDE_ROOT,
            CURSOR_PLUGIN_ROOT: `${CLAUDE_ROOT}/`,
          },
          homeDir: HOME,
          scriptPath: CLAUDE_SCRIPT,
        }),
      ).toBe('cursor');
    });

    it('is claude-code when CURSOR_PLUGIN_ROOT names some other plugin', () => {
      expect(
        detectClaudeBundleHost({
          env: {
            CLAUDE_PLUGIN_ROOT: CLAUDE_ROOT,
            CURSOR_PLUGIN_ROOT: path.join(HOME, '.cursor/plugins/cache/x/y/z'),
          },
          homeDir: HOME,
          scriptPath: CLAUDE_SCRIPT,
        }),
      ).toBe('claude-code');
    });

    it('is claude-code when the script is not under the roots', () => {
      expect(
        detectClaudeBundleHost({
          env: {
            CLAUDE_PLUGIN_ROOT: CLAUDE_ROOT,
            CURSOR_PLUGIN_ROOT: CLAUDE_ROOT,
          },
          homeDir: HOME,
          scriptPath: path.join(HOME, 'repo/.claude/hooks/x.cjs'),
        }),
      ).toBe('claude-code');
    });
  });

  describe('when codex runs a marketplace install', () => {
    it('is codex for a script under the default codex cache', () => {
      const root = path.join(
        HOME,
        '.codex/plugins/cache/openthrottle/openthrottle/1.3.0',
      );
      expect(
        detectClaudeBundleHost({
          env: { CLAUDE_PLUGIN_ROOT: root, PLUGIN_ROOT: root },
          homeDir: HOME,
          scriptPath: path.join(root, 'hooks/skill-usage-heartbeat.cjs'),
        }),
      ).toBe('codex');
    });

    it('honors CODEX_HOME', () => {
      const codexHome = path.resolve('/opt/codex');
      expect(
        detectClaudeBundleHost({
          env: { CODEX_HOME: codexHome },
          homeDir: HOME,
          scriptPath: path.join(codexHome, 'plugins/cache/o/o/1/hooks/h.cjs'),
        }),
      ).toBe('codex');
    });
  });

  describe('when agy runs an imported copy', () => {
    it('is antigravity for a script under ~/.gemini/config/plugins', () => {
      expect(
        detectClaudeBundleHost({
          env: {},
          homeDir: HOME,
          scriptPath: path.join(
            HOME,
            '.gemini/config/plugins/openthrottle/hooks/skill-usage-heartbeat.cjs',
          ),
        }),
      ).toBe('antigravity');
    });
  });

  describe('when there is no script path', () => {
    it('falls back to claude-code', () => {
      expect(
        detectClaudeBundleHost({
          env: {},
          homeDir: HOME,
          scriptPath: undefined,
        }),
      ).toBe('claude-code');
    });
  });
});

describe('resolveBundleHostProjectDir', () => {
  it('uses CLAUDE_PROJECT_DIR for claude-code', () => {
    expect(
      resolveBundleHostProjectDir('claude-code', { CLAUDE_PROJECT_DIR: '/r' }),
    ).toBe('/r');
  });

  it('uses CURSOR_PROJECT_DIR for cursor and ignores CLAUDE_PROJECT_DIR', () => {
    expect(
      resolveBundleHostProjectDir('cursor', {
        CLAUDE_PROJECT_DIR: '/inherited',
        CURSOR_PROJECT_DIR: '/c',
      }),
    ).toBe('/c');
  });

  it('ignores an inherited CLAUDE_PROJECT_DIR for codex and agy', () => {
    for (const host of ['codex', 'antigravity'] as const) {
      expect(
        resolveBundleHostProjectDir(host, {
          CLAUDE_PROJECT_DIR: '/inherited',
          OPEN_THROTTLE_REPO_ROOT: '/o',
        }),
      ).toBe('/o');
    }
  });
});
