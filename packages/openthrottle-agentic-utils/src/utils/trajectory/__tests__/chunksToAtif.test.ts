import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AtifTrajectory } from '../../../types/atif.ts';
import { readStructuredOutput } from '../../structured-output/chunk-reader.ts';
import { ATIF_SCHEMA_VERSION, chunksToAtif } from '../chunksToAtif.ts';

const FIXTURES = join(
  import.meta.dirname,
  '..',
  '..',
  'structured-output',
  '__tests__',
  'fixtures',
);

const PROMPT = `Create a file named hello.txt containing the single word hi. Then reply with exactly: DONE`;

const trajectoryOf = (
  driverId: string,
  fixture: string,
  reportsToolCalls = true,
): AtifTrajectory => {
  const raw = readFileSync(join(FIXTURES, `${fixture}.ndjson`), 'utf8');

  return chunksToAtif({
    agentName: driverId,
    agentVersion: 'fixture',
    chunks: readStructuredOutput(driverId, raw),
    driverId,
    modelName: undefined,
    openthrottle: { planRunId: 'run-1', taskId: 'task-1' },
    prompt: PROMPT,
    reportsToolCalls,
  });
};

const SUCCESSFUL_RUNS = [
  { driverId: 'antigravity', fixture: 'antigravity', tool: 'write_file' },
  { driverId: 'claude', fixture: 'claude', tool: 'Write' },
  { driverId: 'codex', fixture: 'codex.synthetic', tool: 'command_execution' },
  { driverId: 'cursor', fixture: 'cursor', tool: 'edit' },
];

describe('chunksToAtif', () => {
  describe.each(SUCCESSFUL_RUNS)('$driverId', ({ driverId, fixture, tool }) => {
    const trajectory = trajectoryOf(driverId, fixture);
    const [user, action, reply] = trajectory.steps;

    it('declares the pinned schema version', () => {
      expect(trajectory.schema_version).toBe(ATIF_SCHEMA_VERSION);
    });

    it('opens with the prompt as the user step', () => {
      expect(user).toEqual({ message: PROMPT, source: 'user', step_id: 1 });
    });

    it('records the tool call with its observation correlated by id', () => {
      const call = action?.tool_calls?.[0];
      const result = action?.observation?.results[0];

      expect(call?.function_name).toBe(tool);
      expect(result?.source_call_id).toBe(call?.tool_call_id);
    });

    it('puts the reply after the tool answered in its own step', () => {
      expect(reply).toMatchObject({ message: 'DONE', source: 'agent' });
      expect(reply?.step_id).toBe(3);
    });

    it('counts tokens and steps', () => {
      expect(trajectory.final_metrics?.total_prompt_tokens).toBeGreaterThan(0);
      expect(trajectory.final_metrics?.total_steps).toBe(3);
    });

    it('carries the OpenThrottle facts under extra.openthrottle', () => {
      expect(trajectory.extra?.openthrottle).toMatchObject({
        driver: driverId,
        errors: [],
        incomplete: false,
        planRunId: 'run-1',
        taskId: 'task-1',
      });
    });
  });

  describe('tool arguments', () => {
    it('reads claude arguments from the call', () => {
      const call = trajectoryOf('claude', 'claude').steps[1]?.tool_calls?.[0];

      expect(call?.arguments).toEqual({
        content: 'hi\n',
        file_path: '/tmp/fixture/hello.txt',
      });
    });

    it('reads cursor arguments from inside its named tool body', () => {
      const call = trajectoryOf('cursor', 'cursor').steps[1]?.tool_calls?.[0];

      expect(call?.arguments).toEqual({
        path: '/tmp/fixture/hello.txt',
        streamContent: 'hi\n',
      });
    });
  });

  describe('codex, whose finished item opens and resolves its call at once', () => {
    const call = trajectoryOf('codex', 'codex.synthetic').steps[1]
      ?.tool_calls?.[0];

    it('records a real call keyed by the item id, not a synthesized one', () => {
      expect(call?.extra).toBeUndefined();
      expect(call?.tool_call_id).toBe('i1');
    });

    it('keeps the command without its login-shell wrapper', () => {
      expect(call?.arguments).toEqual({ command: 'echo hi > hello.txt' });
    });
  });

  describe('token accounting', () => {
    it('adds Anthropic-style cache reads and writes back into the prompt', () => {
      const metrics = trajectoryOf('claude', 'claude').final_metrics;

      expect(metrics?.total_prompt_tokens).toBe(4 + 73411 + 24298);
      expect(metrics?.total_cached_tokens).toBe(73411);
      expect(metrics?.total_cost_usd).toBeGreaterThan(0);
    });

    it('treats OpenAI-style cached tokens as a subset of the input', () => {
      const metrics = trajectoryOf('codex', 'codex.synthetic').final_metrics;

      expect(metrics?.total_prompt_tokens).toBe(5400);
      expect(metrics?.total_cached_tokens).toBe(1200);
      expect(metrics?.total_completion_tokens).toBe(42);
    });

    it('has no cost when the CLI priced nothing', () => {
      const metrics = trajectoryOf('codex', 'codex.synthetic').final_metrics;

      expect(metrics).not.toHaveProperty('total_cost_usd');
    });

    it('keeps the raw usage for audit', () => {
      const metrics = trajectoryOf('codex', 'codex.synthetic').final_metrics;

      expect(metrics?.extra?.raw_usage).toEqual([
        { cached_input_tokens: 1200, input_tokens: 5400, output_tokens: 42 },
      ]);
    });
  });

  describe('a run that failed after a tool call', () => {
    const trajectory = trajectoryOf('opencode', 'opencode');

    it('records the call it did make', () => {
      expect(trajectory.steps[1]?.tool_calls?.[0]?.function_name).toBe('write');
    });

    it('records the error', () => {
      expect(trajectory.extra?.openthrottle).toMatchObject({
        errors: [expect.stringContaining('use case details')],
      });
    });
  });

  describe('a driver that cannot report tool calls', () => {
    it('marks the trajectory incomplete', () => {
      const trajectory = trajectoryOf('grok', 'grok', false);

      expect(trajectory.extra?.openthrottle).toMatchObject({
        incomplete: true,
      });
    });
  });

  describe('no prompt', () => {
    it('starts with the first agent step', () => {
      const trajectory = chunksToAtif({
        agentName: 'codex',
        agentVersion: 'fixture',
        chunks: [{ delta: 'hi', done: false, kind: 'text' }],
        driverId: 'codex',
        modelName: 'gpt-5',
        openthrottle: {},
        prompt: undefined,
        reportsToolCalls: true,
      });

      expect(trajectory.steps).toEqual([
        { message: 'hi', source: 'agent', step_id: 1 },
      ]);
      expect(trajectory.agent.model_name).toBe('gpt-5');
    });
  });
});
