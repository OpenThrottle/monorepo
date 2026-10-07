import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentsMdOutcome } from '../check-claude-global-settings.ts';
import {
  AGENTS_MD_PLUGIN_KEY,
  describeOutcome,
  evaluateAgentsMdSetting,
  readClaudeSettingsFile,
  remediationSnippet,
  REQUIRED_INSTRUCTION_FILES,
  resolveClaudeSettingsPath,
  runClaudeGlobalSettingsCheck,
} from '../check-claude-global-settings.ts';
import type { Logger } from '../lib/index.ts';

/** A settings document with the AGENTS.md option set to `instructionFiles`. */
function settingsWith(instructionFiles: unknown): string {
  return JSON.stringify({
    pluginConfigs: {
      [AGENTS_MD_PLUGIN_KEY]: { options: { instructionFiles } },
    },
  });
}

/** A logger whose every method records `<method>: <message>`. */
function recordingLogger(): { lines: string[]; logger: Logger } {
  const lines: string[] = [];
  const record =
    (method: string) =>
    (message: string): void => {
      lines.push(`${method}: ${message}`);
    };

  return {
    lines,
    logger: {
      blank: () => {
        lines.push('blank:');
      },
      detail: record('detail'),
      fail: record('fail'),
      heading: record('heading'),
      info: record('info'),
      step: record('step'),
      success: record('success'),
      warn: record('warn'),
    },
  };
}

describe('resolveClaudeSettingsPath', () => {
  it('defaults to ~/.claude/settings.json', () => {
    expect(resolveClaudeSettingsPath({}, '/home/me')).toBe(
      join('/home/me', '.claude', 'settings.json'),
    );
  });

  it('prefers CLAUDE_CONFIG_DIR when set', () => {
    expect(
      resolveClaudeSettingsPath({ CLAUDE_CONFIG_DIR: '/cfg' }, '/home/me'),
    ).toBe(join('/cfg', 'settings.json'));
  });

  it('ignores an empty CLAUDE_CONFIG_DIR', () => {
    expect(resolveClaudeSettingsPath({ CLAUDE_CONFIG_DIR: '' }, '/h')).toBe(
      join('/h', '.claude', 'settings.json'),
    );
  });
});

describe('evaluateAgentsMdSetting', () => {
  it('reports a missing file for undefined', () => {
    expect(evaluateAgentsMdSetting(undefined)).toEqual({
      kind: 'missing-file',
    });
  });

  it('reports invalid JSON with the parser message', () => {
    const outcome = evaluateAgentsMdSetting('{ nope');

    expect(outcome.kind).toBe('invalid-json');
    expect(outcome.kind === 'invalid-json' && outcome.message).not.toBe('');
  });

  it('is ok for the required value', () => {
    expect(
      evaluateAgentsMdSetting(settingsWith(REQUIRED_INSTRUCTION_FILES)),
    ).toEqual({ kind: 'ok' });
  });

  it('is ok alongside unrelated settings and plugins', () => {
    const raw = JSON.stringify({
      model: 'x',
      pluginConfigs: {
        [AGENTS_MD_PLUGIN_KEY]: {
          options: { instructionFiles: REQUIRED_INSTRUCTION_FILES },
        },
        other: { options: { a: 1 } },
      },
    });

    expect(evaluateAgentsMdSetting(raw)).toEqual({ kind: 'ok' });
  });

  it.each([
    ['empty object', '{}'],
    ['no plugin entry', '{"pluginConfigs":{}}'],
    ['no options', `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":{}}}`],
    [
      'no instructionFiles',
      `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":{"options":{}}}}`,
    ],
  ])('is unset for %s', (_label, raw) => {
    expect(evaluateAgentsMdSetting(raw)).toEqual({ kind: 'unset' });
  });

  it('reports a wrong string value', () => {
    expect(evaluateAgentsMdSetting(settingsWith('claude-md'))).toEqual({
      kind: 'wrong-value',
      value: '"claude-md"',
    });
  });

  it('reports a wrong non-string value', () => {
    expect(evaluateAgentsMdSetting(settingsWith(true))).toEqual({
      kind: 'wrong-value',
      value: 'true',
    });
  });

  it.each([
    ['array root', '[]'],
    ['null root', 'null'],
    ['string root', '"hi"'],
    ['array pluginConfigs', '{"pluginConfigs":[]}'],
    ['string pluginConfigs', '{"pluginConfigs":"x"}'],
    ['null pluginConfigs', '{"pluginConfigs":null}'],
    ['array plugin', `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":[]}}`],
    ['null plugin', `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":null}}`],
    [
      'array options',
      `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":{"options":[]}}}`,
    ],
    [
      'string options',
      `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":{"options":"x"}}}`,
    ],
    [
      'null options',
      `{"pluginConfigs":{"${AGENTS_MD_PLUGIN_KEY}":{"options":null}}}`,
    ],
  ])('reports a wrong shape for %s without throwing', (_label, raw) => {
    expect(evaluateAgentsMdSetting(raw).kind).toBe('wrong-shape');
  });
});

describe('remediationSnippet', () => {
  it('parses as JSON and evaluates to ok', () => {
    const snippet = remediationSnippet();

    expect(() => JSON.parse(snippet)).not.toThrow();
    expect(evaluateAgentsMdSetting(snippet)).toEqual({ kind: 'ok' });
  });

  it('still evaluates to ok when merged into existing pluginConfigs', () => {
    const existing = {
      model: 'x',
      pluginConfigs: { other: { enabled: true } },
    };
    const snippet: { pluginConfigs: Record<string, unknown> } =
      JSON.parse(remediationSnippet());
    const merged = JSON.stringify({
      ...existing,
      pluginConfigs: { ...existing.pluginConfigs, ...snippet.pluginConfigs },
    });

    expect(evaluateAgentsMdSetting(merged)).toEqual({ kind: 'ok' });
  });

  it('names the plugin key and required value', () => {
    expect(remediationSnippet()).toContain(AGENTS_MD_PLUGIN_KEY);
    expect(remediationSnippet()).toContain(REQUIRED_INSTRUCTION_FILES);
  });
});

describe('readClaudeSettingsFile and runClaudeGlobalSettingsCheck', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'claude-settings-check-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  it('reads existing contents', () => {
    const path = join(dir, 'settings.json');
    writeFileSync(path, '{"a":1}');

    expect(readClaudeSettingsFile(path)).toEqual({
      contents: '{"a":1}',
      kind: 'contents',
    });
  });

  it('classifies a missing file', () => {
    expect(readClaudeSettingsFile(join(dir, 'nope.json'))).toEqual({
      kind: 'missing-file',
    });
  });

  it('classifies a directory in place of the file as unreadable', () => {
    const path = join(dir, 'settings.json');
    mkdirSync(path);

    expect(readClaudeSettingsFile(path).kind).toBe('unreadable');
  });

  it('succeeds quietly for a correct file and honors CLAUDE_CONFIG_DIR', () => {
    writeFileSync(
      join(dir, 'settings.json'),
      settingsWith(REQUIRED_INSTRUCTION_FILES),
    );
    const { lines, logger } = recordingLogger();

    const result = runClaudeGlobalSettingsCheck({
      env: { CLAUDE_CONFIG_DIR: dir },
      homedir: join(dir, 'unused-home'),
      logger,
    });

    expect(result.outcome).toEqual({ kind: 'ok' });
    expect(result.settingsPath).toBe(join(dir, 'settings.json'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^success: /);
  });

  it('warns with the path, outcome and snippet when the file is missing', () => {
    const { lines, logger } = recordingLogger();

    const result = runClaudeGlobalSettingsCheck({
      env: { CLAUDE_CONFIG_DIR: dir },
      homedir: dir,
      logger,
    });
    const output = lines.join('\n');

    expect(result.outcome).toEqual({ kind: 'missing-file' });
    expect(output).toContain('warn: ');
    expect(output).toContain(join(dir, 'settings.json'));
    expect(output).toContain('does not exist');
    expect(output).toContain(REQUIRED_INSTRUCTION_FILES);
    expect(output).not.toContain('success: ');
  });

  it('reports an unreadable settings path distinctly', () => {
    mkdirSync(join(dir, 'settings.json'));
    const { logger } = recordingLogger();

    const result = runClaudeGlobalSettingsCheck({
      env: { CLAUDE_CONFIG_DIR: dir },
      homedir: dir,
      logger,
    });

    expect(result.outcome.kind).toBe('unreadable');
  });

  it('falls back to <home>/.claude/settings.json and never writes it', () => {
    const claudeDir = join(dir, '.claude');
    mkdirSync(claudeDir);
    const path = join(claudeDir, 'settings.json');
    const original = '{"model":"x"}';
    writeFileSync(path, original);
    const { logger } = recordingLogger();

    const result = runClaudeGlobalSettingsCheck({
      env: {},
      homedir: dir,
      logger,
    });

    expect(result.settingsPath).toBe(path);
    expect(result.outcome).toEqual({ kind: 'unset' });
    expect(readClaudeSettingsFile(path)).toEqual({
      contents: original,
      kind: 'contents',
    });
  });

  it('classifies invalid JSON and a wrong value through the runner', () => {
    const { logger } = recordingLogger();
    writeFileSync(join(dir, 'settings.json'), '{ broken');

    expect(
      runClaudeGlobalSettingsCheck({
        env: { CLAUDE_CONFIG_DIR: dir },
        homedir: dir,
        logger,
      }).outcome.kind,
    ).toBe('invalid-json');

    writeFileSync(join(dir, 'settings.json'), settingsWith('claude-md'));

    expect(
      runClaudeGlobalSettingsCheck({
        env: { CLAUDE_CONFIG_DIR: dir },
        homedir: dir,
        logger,
      }).outcome.kind,
    ).toBe('wrong-value');
  });
});

describe('describeOutcome', () => {
  it('has a non-empty description for every outcome kind', () => {
    const outcomes: AgentsMdOutcome[] = [
      { kind: 'invalid-json', message: 'bad' },
      { kind: 'missing-file' },
      { kind: 'ok' },
      { kind: 'unreadable', message: 'EACCES' },
      { kind: 'unset' },
      { kind: 'wrong-shape', message: 'bad shape' },
      { kind: 'wrong-value', value: '"x"' },
    ];

    for (const outcome of outcomes) {
      expect(describeOutcome(outcome)).not.toBe('');
    }
  });
});
