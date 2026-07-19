import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type {
  JobRunHookIterationParams,
  JobRunHookIterationResult,
} from '../job-run-hooks-runner';
import {
  buildJobRunHookAgentPrompt,
  executeJobRunHooksPhase,
  readJobRunHookSkillMarkdown,
  resolveJobRunHookLayer1Prompt,
  stripSkillMarkdownFrontmatter,
} from '../job-run-hooks-runner';
import { parseJobRunHookEntry } from '../job-run-lifecycle-hooks-validation';

describe('stripSkillMarkdownFrontmatter', () => {
  it('removes leading YAML frontmatter', () => {
    const raw = `---
name: test
---
# Body`;

    expect(stripSkillMarkdownFrontmatter(raw)).toBe('# Body');
  });

  it('returns trimmed body when no frontmatter', () => {
    expect(stripSkillMarkdownFrontmatter('  hello  ')).toBe('hello');
  });
});

describe('readJobRunHookSkillMarkdown', () => {
  it('reads skill file and prefixes path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ot-hook-skill-'));
    const skillRel = '.agents/skills/test-hook/SKILL.md';
    const skillAbs = join(dir, skillRel);
    mkdirSync(join(dir, '.agents/skills/test-hook'), { recursive: true });
    writeFileSync(
      skillAbs,
      `---
name: test-hook
---
Skill body line.`,
      'utf8',
    );

    const text = readJobRunHookSkillMarkdown(dir, skillRel);

    expect(text).toContain('# Repo skill: .agents/skills/test-hook/SKILL.md');
    expect(text).toContain('Skill body line.');
    expect(text).not.toContain('name: test-hook');
  });
});

describe('resolveJobRunHookLayer1Prompt', () => {
  it('returns named prompt path for prompt_profile named', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });

    expect(resolveJobRunHookLayer1Prompt(entry, process.cwd())).toBe(
      '/agents/ralph',
    );
  });

  it('reads file contents for prompt_profile file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ot-hook-prompt-'));
    const promptFile = 'prompts/hook-preflight.md';
    mkdirSync(join(dir, 'prompts'), { recursive: true });
    writeFileSync(join(dir, promptFile), 'Preflight instructions.', 'utf8');

    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'beforeAll',
      promptDelivery: 'file',
      promptFile,
    });

    expect(resolveJobRunHookLayer1Prompt(entry, dir)).toBe(
      'Preflight instructions.',
    );
  });

  it('loads repo skill markdown for skill kind', () => {
    // Write the skill under a temp cwd rather than reading the real repo file:
    // `.agents/skills/*` symlinks are skill-sync artifacts (gitignored, absent in
    // CI); the canonical source lives at `skills/<slug>/SKILL.md`.
    const dir = mkdtempSync(join(tmpdir(), 'ot-hook-repo-skill-'));
    const skillRel = '.agents/skills/workflow-ralph/SKILL.md';
    mkdirSync(join(dir, '.agents/skills/workflow-ralph'), { recursive: true });
    writeFileSync(
      join(dir, skillRel),
      `---
name: workflow-ralph
---
# Workflow Ralph (CLI and queue)`,
      'utf8',
    );

    const entry = parseJobRunHookEntry({
      kind: 'skill',
      phase: 'afterAll',
      skillPath: skillRel,
    });

    const text = resolveJobRunHookLayer1Prompt(entry, dir);

    expect(text).toContain(
      '# Repo skill: .agents/skills/workflow-ralph/SKILL.md',
    );
    expect(text).toContain('Workflow Ralph');
  });
});

describe('buildJobRunHookAgentPrompt', () => {
  it('combines layer-1, plan block, and hook suffix', () => {
    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });

    const prompt = buildJobRunHookAgentPrompt({
      entry,
      layer1Suffix: 'Do preflight.',
      layer1Text: '/agents/ralph',
      planContextBlock: '--- OpenThrottle plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
    });

    expect(prompt).toContain('/agents/ralph');
    expect(prompt).toContain('--- OpenThrottle plan ---');
    expect(prompt).toContain('Plan-Id: 00000000-0000-4000-8000-000000000001');
    expect(prompt).toContain('beforeAll');
    expect(prompt).toContain('Do preflight.');
  });
});

describe('executeJobRunHooksPhase', () => {
  it('returns not blocked when no hooks', async () => {
    const result = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn(),
        cwd: process.cwd(),
        runHookIteration: vi.fn(),
      },
      hooks: undefined,
      layer1Suffix: 'suffix',
      phase: 'beforeAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(result.blocked).toBe(false);
    expect(result.results).toHaveLength(0);
  });

  it('passes composed agent prompt to runHookIteration for skill hook', async () => {
    const runHookIteration = vi
      .fn<
        (
          params: JobRunHookIterationParams,
        ) => Promise<JobRunHookIterationResult>
      >()
      .mockResolvedValue({ ok: true, output: 'ok' });

    // Temp cwd holding the skill file — see note on the sibling skill-kind test.
    const dir = mkdtempSync(join(tmpdir(), 'ot-hook-repo-skill-'));
    const skillRel = '.agents/skills/workflow-ralph/SKILL.md';
    mkdirSync(join(dir, '.agents/skills/workflow-ralph'), { recursive: true });
    writeFileSync(
      join(dir, skillRel),
      `---
name: workflow-ralph
---
# Workflow Ralph (CLI and queue)`,
      'utf8',
    );

    const entry = parseJobRunHookEntry({
      kind: 'skill',
      phase: 'beforeAll',
      skillPath: skillRel,
    });

    await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn().mockResolvedValue(undefined),
        cwd: dir,
        runHookIteration,
      },
      hooks: { hooks: [entry] },
      layer1Suffix: 'suffix',
      phase: 'beforeAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(runHookIteration).toHaveBeenCalledTimes(1);
    const agentPrompt = runHookIteration.mock.calls[0]?.[0]?.agentPrompt;
    expect(agentPrompt).toContain('workflow-ralph/SKILL.md');
    expect(agentPrompt).toContain('--- plan ---');
    expect(agentPrompt).toContain('beforeAll');
  });

  it('blocks before_run when hook fails with on_failure block', async () => {
    const appendPlanOutput = vi.fn().mockResolvedValue(undefined);
    const runHookIteration = vi.fn().mockResolvedValue({
      errorMessage: 'agent error',
      ok: false,
    });

    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      onFailure: 'block',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });

    const result = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput,
        cwd: process.cwd(),
        runHookIteration,
      },
      hooks: { hooks: [entry] },
      layer1Suffix: 'suffix',
      phase: 'beforeAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(result.blocked).toBe(true);
    expect(runHookIteration).toHaveBeenCalledTimes(1);
    expect(appendPlanOutput).toHaveBeenCalled();
  });

  it('continues before_run when hook fails with on_failure warn', async () => {
    const runHookIteration = vi.fn().mockResolvedValue({
      errorMessage: 'agent error',
      ok: false,
    });

    const entry = parseJobRunHookEntry({
      kind: 'prompt_profile',
      onFailure: 'warn',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });

    const result = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn().mockResolvedValue(undefined),
        cwd: process.cwd(),
        runHookIteration,
      },
      hooks: { hooks: [entry] },
      layer1Suffix: 'suffix',
      phase: 'beforeAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(result.blocked).toBe(false);
  });

  it('filters after_run hooks by whenMainRunSucceeded', async () => {
    const runHookIteration = vi
      .fn()
      .mockResolvedValue({ ok: true, output: 'ok' });

    const onSuccess = parseJobRunHookEntry({
      conditions: { whenMainRunSucceeded: true },
      kind: 'prompt_profile',
      phase: 'afterAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });
    const onFailure = parseJobRunHookEntry({
      conditions: { whenMainRunSucceeded: false },
      kind: 'prompt_profile',
      phase: 'afterAll',
      prompt: '/agents/seo',
      promptDelivery: 'named',
    });

    const succeeded = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn().mockResolvedValue(undefined),
        cwd: process.cwd(),
        runHookIteration,
      },
      hooks: { hooks: [onSuccess, onFailure] },
      layer1Suffix: 'suffix',
      mainRunStarted: true,
      mainRunSucceeded: true,
      phase: 'afterAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(succeeded.results).toHaveLength(1);
    expect(runHookIteration).toHaveBeenCalledTimes(1);

    runHookIteration.mockClear();

    const failed = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn().mockResolvedValue(undefined),
        cwd: process.cwd(),
        runHookIteration,
      },
      hooks: { hooks: [onSuccess, onFailure] },
      layer1Suffix: 'suffix',
      mainRunStarted: true,
      mainRunSucceeded: false,
      phase: 'afterAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(failed.results).toHaveLength(1);
    expect(runHookIteration).toHaveBeenCalledTimes(1);
  });

  it('skips hooks when runKinds condition excludes current runKind', async () => {
    const runHookIteration = vi.fn();

    const entry = parseJobRunHookEntry({
      conditions: { runKinds: ['orchestrator'] },
      kind: 'prompt_profile',
      phase: 'beforeAll',
      prompt: '/agents/ralph',
      promptDelivery: 'named',
    });

    const result = await executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: vi.fn(),
        cwd: process.cwd(),
        runHookIteration,
      },
      hooks: { hooks: [entry] },
      layer1Suffix: 'suffix',
      phase: 'beforeAll',
      planContextBlock: '--- plan ---',
      planId: '00000000-0000-4000-8000-000000000001',
      runKind: 'spawn',
    });

    expect(result.blocked).toBe(false);
    expect(runHookIteration).not.toHaveBeenCalled();
  });
});
