/**
 * @description Unit tests for the plan-run workspace preflight: a fresh worktree missing its `.env`
 * or its workspace MCP config, and the relative-launcher case that reads as "connection failed" from
 * anywhere but the repo root.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlanRunWorkspacePreflightService } from './plan-run-workspace-preflight.service.ts';

const CURSOR_CONFIG = {
  mcpServers: {
    maestro: { args: ['mcp'], command: 'maestro' },
    'openthrottle-mcp': {
      args: ['./scripts/run-openthrottle-mcp.sh'],
      command: 'bash',
    },
  },
};

/**
 * Builds a directory that looks like a provisioned worktree, minus whatever the test omits.
 */
const makeWorkspace = (options: {
  readonly config?: unknown;
  readonly env?: boolean;
  readonly launcher?: boolean;
  readonly provisioner?: boolean;
}): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-preflight-'));

  if (options.provisioner !== false) {
    mkdirSync(join(dir, '.worktree'), { recursive: true });
    writeFileSync(join(dir, '.worktree', 'provision.sh'), '#!/bin/sh\n');
  }

  if (options.env !== false) {
    writeFileSync(join(dir, '.env'), 'OPENTHROTTLE_SERVER_APP_URL=http://x\n');
  }
  if (options.config !== undefined) {
    mkdirSync(join(dir, '.cursor'), { recursive: true });
    writeFileSync(
      join(dir, '.cursor', 'mcp.json'),
      typeof options.config === 'string'
        ? options.config
        : JSON.stringify(options.config),
    );
  }
  if (options.launcher === true) {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(
      join(dir, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/sh\n',
    );
  }

  return dir;
};

describe('PlanRunWorkspacePreflightService', () => {
  let service: PlanRunWorkspacePreflightService;

  beforeEach(() => {
    service = new PlanRunWorkspacePreflightService(createMock<LoggerService>());
  });

  it('reports nothing for a fully provisioned worktree', () => {
    const workingDirectory = makeWorkspace({
      config: CURSOR_CONFIG,
      launcher: true,
    });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([]);
  });

  it('flags a missing .env, the credential-prompt trap', () => {
    const workingDirectory = makeWorkspace({
      config: CURSOR_CONFIG,
      env: false,
      launcher: true,
    });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([
      expect.stringContaining('No .env in'),
    ]);
  });

  it('flags a missing workspace MCP config for the backend', () => {
    const workingDirectory = makeWorkspace({ launcher: true });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([
      expect.stringContaining('No .cursor/mcp.json in'),
    ]);
  });

  it('flags a relative launcher that does not resolve from the run directory', () => {
    const workingDirectory = makeWorkspace({ config: CURSOR_CONFIG });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([
      expect.stringContaining('run-openthrottle-mcp.sh'),
    ]);
  });

  it('flags a config that never defines openthrottle-mcp', () => {
    const workingDirectory = makeWorkspace({
      config: {
        mcpServers: { maestro: { args: ['mcp'], command: 'maestro' } },
      },
    });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([
      expect.stringContaining('does not define openthrottle-mcp'),
    ]);
  });

  it('flags unreadable config JSON', () => {
    const workingDirectory = makeWorkspace({ config: '{ not json' });

    expect(service.check({ backend: 'cursor', workingDirectory })).toEqual([
      expect.stringContaining('not readable JSON'),
    ]);
  });

  it('checks .mcp.json for the claude backend', () => {
    const workingDirectory = makeWorkspace({
      config: CURSOR_CONFIG,
      launcher: true,
    });

    expect(service.check({ backend: 'claude', workingDirectory })).toEqual([
      expect.stringContaining('No .mcp.json in'),
    ]);
  });

  describe('when the repo has no worktree provisioner (a foreign repo)', () => {
    it('says the worktree is unprovisioned, names the hook contract, and skips the .env check', () => {
      const workingDirectory = makeWorkspace({
        config: CURSOR_CONFIG,
        env: false,
        launcher: true,
        provisioner: false,
      });

      const warnings = service.check({ backend: 'cursor', workingDirectory });

      expect(warnings).toEqual([
        expect.stringContaining('.worktree/provision.sh'),
      ]);
      expect(warnings.join('\n')).toContain(
        'skills/ot-worktree/references/contract.md',
      );
      expect(warnings.join('\n')).not.toMatch(/pnpm|No \.env/);
    });
  });

  it('never suggests pnpm in the missing-.env warning', () => {
    const workingDirectory = makeWorkspace({
      config: CURSOR_CONFIG,
      env: false,
      launcher: true,
    });

    expect(
      service.check({ backend: 'cursor', workingDirectory }).join('\n'),
    ).not.toContain('pnpm');
  });

  it('reports a run directory that does not exist at all', () => {
    expect(
      service.check({
        backend: 'cursor',
        workingDirectory: '/nope/does/not/exist',
      }),
    ).toEqual([expect.stringContaining('does not exist')]);
  });
});
