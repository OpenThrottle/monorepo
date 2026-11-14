import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SandboxLaunch } from '../sandbox-attachment.ts';
import {
  claudeSandboxConfig,
  isCliDriverId,
  shellQuote,
  writeSandboxAttachment,
} from '../sandbox-attachment.ts';

const execFileAsync = promisify(execFile);

const LAUNCH: SandboxLaunch = {
  args: ['/abs/tsx/cli.mjs', "/abs/it's/bin-sandbox.ts"],
  command: '/abs/node',
  env: { OPENTHROTTLE_MCP_SANDBOX_CALL_LOG: '/tmp/calls.jsonl' },
};

/** A fake CLI that prints its argv as JSON, so the wrapper's real exec can be asserted. */
const ECHO_ARGV = `#!${process.execPath}\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)));\n`;

describe('sandbox-attachment', () => {
  let dir = '';
  let echoBin = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ot-attach-'));
    echoBin = join(dir, 'echo-argv');
    await writeFile(echoBin, ECHO_ARGV, { mode: 0o755 });
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('narrows only the supported CLIs', () => {
    expect(['claude', 'codex', 'cursor', 'api'].filter(isCliDriverId)).toEqual([
      'claude',
      'codex',
    ]);
  });

  it('quotes a shell word containing a single quote', () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });

  describe('for claude', () => {
    it('routes OPENTHROTTLE_CLAUDE_BIN through a wrapper that adds the strict sandbox config', async () => {
      const env = await writeSandboxAttachment({
        dir,
        driverId: 'claude',
        launch: LAUNCH,
        realBin: echoBin,
      });
      const wrapper = env['OPENTHROTTLE_CLAUDE_BIN'] ?? '';
      const { stdout } = await execFileAsync(wrapper, ['-p', 'hello']);
      const configPath = join(dir, 'mcp-config.json');

      expect(JSON.parse(stdout)).toEqual([
        '--strict-mcp-config',
        '--mcp-config',
        configPath,
        '-p',
        'hello',
      ]);
      expect(await readFile(configPath, 'utf8')).toBe(
        claudeSandboxConfig(LAUNCH),
      );
    });
  });

  describe('for codex', () => {
    it('injects the mcp_servers overrides after the exec subcommand', async () => {
      const env = await writeSandboxAttachment({
        dir,
        driverId: 'codex',
        launch: LAUNCH,
        realBin: echoBin,
      });
      const wrapper = env['OPENTHROTTLE_CODEX_BIN'] ?? '';
      const { stdout } = await execFileAsync(wrapper, ['exec', '--json', 'hi']);

      expect(JSON.parse(stdout)).toEqual([
        'exec',
        '-c',
        'mcp_servers.openthrottle-mcp.command="/abs/node"',
        '-c',
        `mcp_servers.openthrottle-mcp.args=["/abs/tsx/cli.mjs","/abs/it's/bin-sandbox.ts"]`,
        '-c',
        'mcp_servers.openthrottle-mcp.env={OPENTHROTTLE_MCP_SANDBOX_CALL_LOG="/tmp/calls.jsonl"}',
        '-c',
        'mcp_servers.openthrottle-mcp.default_tools_approval_mode="approve"',
        '--json',
        'hi',
      ]);
    });
  });
});
