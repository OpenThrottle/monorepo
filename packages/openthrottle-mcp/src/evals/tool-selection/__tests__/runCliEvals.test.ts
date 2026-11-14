import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runDriverIteration } from '@openthrottle/agentic-evals';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TOOLSET_NAMES } from '../../../config/toolsets.ts';
import type { ToolSurface } from '../../../model-facing-text/surface.ts';
import { listToolSurface } from '../../../model-facing-text/surface.ts';
import type { ToolSelectionCase } from '../eval-case.ts';
import { runCliEvals } from '../runCliEvals.ts';

/**
 * A stand-in for `claude`: refuses to run unless the wrapper passed the strict sandbox flags, records its argv,
 * "calls" create_plan by appending to the sandbox call log named in the --mcp-config file (only when it is
 * talking to the sandbox server), and prints the stream-json a real run would.
 */
const STUB = `
const fs = require('node:fs');
const argv = process.argv.slice(2);
fs.writeFileSync(process.env.STUB_ARGV_FILE, JSON.stringify(argv));
const at = argv.indexOf('--mcp-config');
if (!argv.includes('--strict-mcp-config') || at === -1) process.exit(9);
const config = JSON.parse(fs.readFileSync(argv[at + 1], 'utf8'));
const sandbox = config.mcpServers['openthrottle-mcp'];
const server = process.env.STUB_SERVER || 'openthrottle-mcp';
const input = { author: 'visormatt', title: 'Stub plan' };
if (server === 'openthrottle-mcp') {
  fs.appendFileSync(sandbox.env.OPENTHROTTLE_MCP_SANDBOX_CALL_LOG,
    JSON.stringify({ args: input, tool: 'create_plan', ts: '2026-11-13T00:00:00.000Z' }) + '\\n');
}
const usage = { input_tokens: 3, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
const lines = [
  { type: 'assistant', session_id: 's', message: { id: 'm1', type: 'message', role: 'assistant', model: 'stub',
    content: [{ type: 'tool_use', id: 'tu1', name: 'mcp__' + server + '__create_plan', input }], usage } },
  { type: 'user', session_id: 's', message: { role: 'user',
    content: [{ type: 'tool_result', tool_use_id: 'tu1', content: '{"ok":true,"sandbox":true}' }] } },
  { type: 'assistant', session_id: 's', message: { id: 'm2', type: 'message', role: 'assistant', model: 'stub',
    content: [{ type: 'text', text: 'DONE' }], usage } },
  { type: 'result', subtype: 'success', is_error: false, result: 'DONE', session_id: 's', usage },
];
process.stdout.write(lines.map((line) => JSON.stringify(line)).join('\\n') + '\\n');
`;

const CASE: ToolSelectionCase = {
  area: 'plan-crud',
  expect: {
    args: { title: { kind: 'includes', value: 'stub' } },
    kind: 'call',
    tools: ['create_plan'],
  },
  forbid: [],
  id: 'stub-create',
  origin: { kind: 'seed' },
  prompt: 'Create a plan titled "Stub plan".',
};

describe('runCliEvals through the real driver with a stub claude', () => {
  let dir = '';
  let stubBin = '';
  let surface: ToolSurface;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ot-cli-eval-stub-'));
    stubBin = join(dir, 'claude-stub');
    await writeFile(stubBin, `#!${process.execPath}\n${STUB}`, {
      mode: 0o755,
    });
    surface = await listToolSurface(new Set(TOOLSET_NAMES));
  });

  afterAll(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  const run = async (
    trials: number,
    env: Readonly<Record<string, string>>,
  ): ReturnType<typeof runCliEvals> => {
    return runCliEvals({
      authMode: 'subscription',
      cases: [CASE],
      driverId: 'claude',
      effort: undefined,
      launchFor: (callLogPath) => {
        return {
          args: [],
          command: 'unused-by-the-stub',
          env: { OPENTHROTTLE_MCP_SANDBOX_CALL_LOG: callLogPath },
        };
      },
      model: undefined,
      onTrial: () => undefined,
      realBin: stubBin,
      runIteration: async (input) => {
        return runDriverIteration({
          ...input,
          env: { ...input.env, ...env },
        });
      },
      surface,
      timeoutMs: 30_000,
      trials,
    });
  };

  describe('when the CLI calls the sandbox', () => {
    it('grades the first OT call and records driver, model and auth mode', async () => {
      const argvFile = join(dir, 'argv-pass.json');
      const { result } = await run(1, { STUB_ARGV_FILE: argvFile });

      expect(result.cases).toEqual([
        { failures: [], id: 'stub-create', passes: 1, trials: 1 },
      ]);
      expect(result).toMatchObject({
        authMode: 'subscription',
        driver: 'claude',
        leak: null,
        model: 'claude/cli-default',
      });
      const argv: unknown = JSON.parse(await readFile(argvFile, 'utf8'));
      expect(argv).toEqual(
        expect.arrayContaining(['--strict-mcp-config', '--mcp-config', '-p']),
      );
    });
  });

  describe('when an OT call reaches another server', () => {
    it('reports the leak and runs no further trial', async () => {
      const { result } = await run(2, {
        STUB_ARGV_FILE: join(dir, 'argv-leak.json'),
        STUB_SERVER: 'openthrottle',
      });

      expect(result.leak).toContain('"openthrottle"');
      const [only] = result.cases;
      expect(only?.passes).toBe(0);
      expect(only?.failures[0]).toContain('leak');
      expect(only?.failures[1]).toContain('not run');
    });
  });
});
