/**
 * @description Tests for job-run lifecycle hook config parsing and guards.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  defaultJobRunHookOnFailure,
  formatJobRunHookEntryLabel,
  resolveJobRunHookOnFailure,
  sortJobRunHookEntries,
} from '../../types/job-run-lifecycle-hooks';
import {
  parseJobRunHookEntry,
  parseJobRunHooksConfig,
  resolveJobRunHookTimeoutSeconds,
  shouldRunJobRunHook,
  validateJobRunHookNamedPrompt,
  validateJobRunHookSkillPath,
} from '../job-run-lifecycle-hooks-validation';

describe('defaultJobRunHookOnFailure', () => {
  it('uses block for before_run and warn for after_run', () => {
    expect(defaultJobRunHookOnFailure('before_run')).toBe('block');
    expect(defaultJobRunHookOnFailure('after_run')).toBe('warn');
  });
});

describe('parseJobRunHookEntry', () => {
  it('parses named prompt_profile from prompt field', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'before_run',
      prompt: '/agents/ralph',
    });
    expect(entry).toMatchObject({
      kind: 'prompt_profile',
      phase: 'before_run',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });
  });

  it('parses named prompt_profile from legacy target field', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'after_run',
      target: '/agents/seo',
    });
    expect(entry.kind).toBe('prompt_profile');
    if (entry.kind === 'prompt_profile' && entry.promptDelivery === 'named') {
      expect(entry.prompt).toBe('/agents/seo');
    }
  });

  it('parses file prompt_profile', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'before_run',
      promptDelivery: 'file',
      promptFile: 'prompts/preflight.md',
    });
    expect(entry).toMatchObject({
      kind: 'prompt_profile',
      promptDelivery: 'file',
      promptFile: 'prompts/preflight.md',
    });
  });

  it('parses skill hook', () => {
    const entry = parseJobRunHookEntry({
      kind: 'skill',
      phase: 'after_run',
      skillPath: '.agents/skills/workflow-ralph/SKILL.md',
    });
    expect(entry).toMatchObject({
      kind: 'skill',
      skillPath: '.agents/skills/workflow-ralph/SKILL.md',
    });
  });

  it('rejects whenMainRunSucceeded on before_run', () => {
    expect(() =>
      parseJobRunHookEntry({
        kind: 'skill',
        phase: 'before_run',
        skillPath: '.agents/skills/foo/SKILL.md',
        conditions: { whenMainRunSucceeded: true },
      }),
    ).toThrow(/whenMainRunSucceeded/);
  });

  it('rejects named prompt without leading slash', () => {
    expect(() =>
      parseJobRunHookEntry({
        kind: 'prompt_profile',
        phase: 'before_run',
        prompt: 'agents/ralph',
      }),
    ).toThrow(/must start with/);
  });
});

describe('parseJobRunHooksConfig', () => {
  it('returns empty hooks for null', () => {
    expect(parseJobRunHooksConfig(null)).toEqual({ hooks: [] });
  });

  it('sorts before_run before after_run and by order', () => {
    const { hooks } = parseJobRunHooksConfig([
      { kind: 'skill', phase: 'after_run', skillPath: '.agents/skills/a/SKILL.md', order: 1 },
      { kind: 'prompt_profile', phase: 'before_run', prompt: '/agents/ralph', order: 2 },
      { kind: 'prompt_profile', phase: 'before_run', prompt: '/agents/seo', order: 1 },
    ]);
    expect(hooks.map((h) => h.phase)).toEqual([
      'before_run',
      'before_run',
      'after_run',
    ]);
    if (hooks[0]?.kind === 'prompt_profile' && hooks[0].promptDelivery === 'named') {
      expect(hooks[0].prompt).toBe('/agents/seo');
    }
  });

  it('rejects more than max hooks per phase', () => {
    const hooks = Array.from({ length: 11 }, () => ({
      kind: 'prompt_profile' as const,
      phase: 'before_run' as const,
      prompt: '/agents/ralph',
      promptDelivery: 'named' as const,
    }));
    expect(() => parseJobRunHooksConfig(hooks)).toThrow(/per phase/);
  });

  it('rejects more than max total hooks', () => {
    const hooks = Array.from({ length: 21 }, (_, index) => ({
      kind: 'prompt_profile' as const,
      phase: (index < 11 ? 'before_run' : 'after_run') as const,
      prompt: '/agents/ralph',
      promptDelivery: 'named' as const,
    }));
    expect(() => parseJobRunHooksConfig(hooks)).toThrow(/20/);
  });

  it('validates skill path exists when requireTargetsExist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hook-skill-'));
    try {
      const skillRel = '.agents/skills/test-hook/SKILL.md';
      const skillAbs = join(dir, skillRel);
      mkdirSync(join(dir, '.agents/skills/test-hook'), { recursive: true });
      writeFileSync(skillAbs, '# Test\n', 'utf8');
      const { hooks } = parseJobRunHooksConfig(
        [{ kind: 'skill', phase: 'after_run', skillPath: skillRel }],
        { cwd: dir, requireTargetsExist: true },
      );
      expect(hooks).toHaveLength(1);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('shouldRunJobRunHook', () => {
  const beforeSkill = parseJobRunHookEntry({
    kind: 'skill',
    phase: 'before_run',
    skillPath: '.agents/skills/x/SKILL.md',
    conditions: { runKinds: ['spawn'] },
  });

  it('filters by runKinds', () => {
    expect(
      shouldRunJobRunHook(beforeSkill, {
        phase: 'before_run',
        runKind: 'spawn',
        mainRunSucceeded: false,
        mainRunStarted: false,
      }),
    ).toBe(true);
    expect(
      shouldRunJobRunHook(beforeSkill, {
        phase: 'before_run',
        runKind: 'orchestrator',
        mainRunSucceeded: false,
        mainRunStarted: false,
      }),
    ).toBe(false);
  });

  it('filters after_run by whenMainRunSucceeded', () => {
    const after = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'after_run',
      prompt: '/agents/ralph',
      conditions: { whenMainRunSucceeded: true },
    });
    expect(
      shouldRunJobRunHook(after, {
        phase: 'after_run',
        runKind: 'spawn',
        mainRunSucceeded: true,
        mainRunStarted: true,
      }),
    ).toBe(true);
    expect(
      shouldRunJobRunHook(after, {
        phase: 'after_run',
        runKind: 'spawn',
        mainRunSucceeded: false,
        mainRunStarted: true,
      }),
    ).toBe(false);
  });
});

describe('helpers', () => {
  it('resolveJobRunHookOnFailure applies defaults', () => {
    expect(
      resolveJobRunHookOnFailure({ phase: 'before_run', onFailure: undefined }),
    ).toBe('block');
    expect(
      resolveJobRunHookOnFailure({
        phase: 'after_run',
        onFailure: 'ignore',
      }),
    ).toBe('ignore');
  });

  it('resolveJobRunHookTimeoutSeconds uses default', () => {
    expect(resolveJobRunHookTimeoutSeconds({})).toBe(600);
    expect(resolveJobRunHookTimeoutSeconds({ timeoutSeconds: 30 })).toBe(30);
  });

  it('formatJobRunHookEntryLabel includes phase and policy', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'before_run',
      prompt: '/agents/ralph',
      onFailure: 'warn',
    });
    expect(formatJobRunHookEntryLabel(entry)).toContain('before_run');
    expect(formatJobRunHookEntryLabel(entry)).toContain('warn');
  });

  it('validateJobRunHookSkillPath rejects bad prefix', () => {
    expect(() => validateJobRunHookSkillPath('skills/foo/SKILL.md')).toThrow(
      /must start with/,
    );
  });

  it('validateJobRunHookNamedPrompt rejects empty', () => {
    expect(() => validateJobRunHookNamedPrompt('  ')).toThrow(/non-empty/);
  });

  it('sortJobRunHookEntries matches parse order', () => {
    const a = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'after_run',
      prompt: '/agents/ralph',
    });
    const b = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'before_run',
      prompt: '/agents/seo',
    });
    expect(sortJobRunHookEntries([a, b])[0]?.phase).toBe('before_run');
  });
});
