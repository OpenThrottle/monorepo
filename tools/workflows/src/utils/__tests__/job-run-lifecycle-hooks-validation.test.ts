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
  normalizeJobRunHookPhase,
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

describe('normalizeJobRunHookPhase', () => {
  it('maps legacy wire values to canonical phases', () => {
    expect(normalizeJobRunHookPhase('before_run')).toBe('beforeAll');
    expect(normalizeJobRunHookPhase('after_run')).toBe('afterAll');
    expect(normalizeJobRunHookPhase('beforeEach')).toBe('beforeEach');
  });
});

describe('defaultJobRunHookOnFailure', () => {
  it('uses block for beforeAll/beforeEach and warn for after phases', () => {
    expect(defaultJobRunHookOnFailure('beforeAll')).toBe('block');
    expect(defaultJobRunHookOnFailure('beforeEach')).toBe('block');
    expect(defaultJobRunHookOnFailure('afterAll')).toBe('warn');
    expect(defaultJobRunHookOnFailure('afterEach')).toBe('warn');
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
      phase: 'beforeAll',
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
    expect(entry.phase).toBe('afterAll');
    if (entry.kind === 'prompt_profile' && entry.promptDelivery === 'named') {
      expect(entry.prompt).toBe('/agents/seo');
    }
  });

  it('parses file prompt_profile', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'beforeAll',
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
      phase: 'afterEach',
      skillPath: '.agents/skills/workflow-ralph/SKILL.md',
    });
    expect(entry).toMatchObject({
      kind: 'skill',
      phase: 'afterEach',
      skillPath: '.agents/skills/workflow-ralph/SKILL.md',
    });
  });

  it('rejects whenMainRunSucceeded on beforeAll', () => {
    expect(() =>
      parseJobRunHookEntry({
        conditions: { whenMainRunSucceeded: true },
        kind: 'skill',
        phase: 'before_run',
        skillPath: '.agents/skills/foo/SKILL.md',
      }),
    ).toThrow(/whenMainRunSucceeded|whenPlanRunSucceeded/);
  });

  it('rejects named prompt without leading slash', () => {
    expect(() =>
      parseJobRunHookEntry({
        kind: 'prompt_profile',
        phase: 'beforeAll',
        prompt: 'agents/ralph',
      }),
    ).toThrow(/must start with/);
  });
});

describe('parseJobRunHooksConfig', () => {
  it('returns empty hooks for null', () => {
    expect(parseJobRunHooksConfig(null)).toEqual({ hooks: [] });
  });

  it('sorts beforeAll before afterAll and by order', () => {
    const { hooks } = parseJobRunHooksConfig([
      {
        kind: 'skill',
        order: 1,
        phase: 'after_run',
        skillPath: '.agents/skills/a/SKILL.md',
      },
      {
        kind: 'prompt_profile',
        order: 2,
        phase: 'before_run',
        prompt: '/agents/ralph',
      },
      {
        kind: 'prompt_profile',
        order: 1,
        phase: 'beforeAll',
        prompt: '/agents/seo',
      },
    ]);
    expect(hooks.map((h) => h.phase)).toEqual([
      'beforeAll',
      'beforeAll',
      'afterAll',
    ]);
    if (
      hooks[0]?.kind === 'prompt_profile' &&
      hooks[0].promptDelivery === 'named'
    ) {
      expect(hooks[0].prompt).toBe('/agents/seo');
    }
  });

  it('rejects more than max hooks per phase', () => {
    const hooks = Array.from({ length: 11 }, () => ({
      kind: 'prompt_profile' as const,
      phase: 'beforeAll' as const,
      prompt: '/agents/ralph',
      promptDelivery: 'named' as const,
    }));
    expect(() => parseJobRunHooksConfig(hooks)).toThrow(/per phase/);
  });

  it('rejects more than max total hooks', () => {
    const hooks = Array.from({ length: 21 }, (_, index) => ({
      kind: 'prompt_profile' as const,
      phase: index < 11 ? ('beforeAll' as const) : ('afterAll' as const),
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
        [{ kind: 'skill', phase: 'afterAll', skillPath: skillRel }],
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
    conditions: { runKinds: ['spawn'] },
    kind: 'skill',
    phase: 'beforeAll',
    skillPath: '.agents/skills/x/SKILL.md',
  });

  it('filters by runKinds', () => {
    expect(
      shouldRunJobRunHook(beforeSkill, {
        mainRunStarted: false,
        mainRunSucceeded: false,
        phase: 'beforeAll',
        runKind: 'spawn',
      }),
    ).toBe(true);
    expect(
      shouldRunJobRunHook(beforeSkill, {
        mainRunStarted: false,
        mainRunSucceeded: false,
        phase: 'beforeAll',
        runKind: 'orchestrator',
      }),
    ).toBe(false);
  });

  it('filters afterAll by whenMainRunSucceeded', () => {
    const after = parseJobRunHookEntry({
      conditions: { whenMainRunSucceeded: true },
      kind: 'prompt_profile',
      phase: 'afterAll',
      prompt: '/agents/ralph',
    });
    expect(
      shouldRunJobRunHook(after, {
        mainRunStarted: true,
        mainRunSucceeded: true,
        phase: 'afterAll',
        runKind: 'spawn',
      }),
    ).toBe(true);
    expect(
      shouldRunJobRunHook(after, {
        mainRunStarted: true,
        mainRunSucceeded: false,
        phase: 'afterAll',
        runKind: 'spawn',
      }),
    ).toBe(false);
  });

  it('filters afterEach by whenTaskOutcome and taskCategories', () => {
    const afterEach = parseJobRunHookEntry({
      conditions: {
        taskCategories: ['infra'],
        whenTaskOutcome: ['completed'],
      },
      kind: 'prompt_profile',
      phase: 'afterEach',
      prompt: '/agents/ci',
    });
    expect(
      shouldRunJobRunHook(afterEach, {
        mainRunStarted: true,
        mainRunSucceeded: true,
        phase: 'afterEach',
        runKind: 'orchestrator',
        task: {
          category: 'infra',
          id: 'task-1',
          status: 'COMPLETED',
          title: 'CI',
        },
        taskOutcome: 'completed',
      }),
    ).toBe(true);
    expect(
      shouldRunJobRunHook(afterEach, {
        mainRunStarted: true,
        mainRunSucceeded: true,
        phase: 'afterEach',
        runKind: 'orchestrator',
        task: {
          category: 'docs',
          id: 'task-1',
          status: 'COMPLETED',
          title: 'Docs',
        },
        taskOutcome: 'completed',
      }),
    ).toBe(false);
  });
});

describe('helpers', () => {
  it('resolveJobRunHookOnFailure applies defaults', () => {
    expect(
      resolveJobRunHookOnFailure({ onFailure: undefined, phase: 'beforeAll' }),
    ).toBe('block');
    expect(
      resolveJobRunHookOnFailure({
        onFailure: 'ignore',
        phase: 'afterAll',
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
      onFailure: 'warn',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
    });
    expect(formatJobRunHookEntryLabel(entry)).toContain('beforeAll');
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
      phase: 'afterAll',
      prompt: '/agents/ralph',
    });
    const b = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'beforeAll',
      prompt: '/agents/seo',
    });
    expect(sortJobRunHookEntries([a, b])[0]?.phase).toBe('beforeAll');
  });
});
