import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { RepositoryInspectionService } from './repository-inspection.service';

const execFileAsync = promisify(execFile);

describe('RepositoryInspectionService', () => {
  const mockCheckoutsService = createMock<RepositoryCheckoutsService>({
    saveInspection: vi.fn(),
  });

  const service = new RepositoryInspectionService(
    createMock<LoggerService>(),
    mockCheckoutsService,
  );

  let fixturesRoot: string;
  let gitRepoDir: string;
  let plainDir: string;

  beforeAll(async () => {
    fixturesRoot = await mkdtemp(join(tmpdir(), 'ot-inspection-'));

    // Fixture 1: a real git repo with a remote, stack markers, and agent config.
    gitRepoDir = join(fixturesRoot, 'git-repo');
    await mkdir(gitRepoDir, { recursive: true });
    await execFileAsync('git', ['-C', gitRepoDir, 'init', '--quiet']);
    await execFileAsync('git', [
      '-C',
      gitRepoDir,
      'remote',
      'add',
      'origin',
      'git@github.com:OpenThrottle/fixture.git',
    ]);
    await writeFile(join(gitRepoDir, 'nx.json'), '{}');
    await writeFile(join(gitRepoDir, 'pnpm-lock.yaml'), '');
    await writeFile(join(gitRepoDir, 'pnpm-workspace.yaml'), '');
    await writeFile(join(gitRepoDir, 'tsconfig.json'), '{}');
    await writeFile(join(gitRepoDir, 'package.json'), '{}');
    await writeFile(join(gitRepoDir, 'CLAUDE.md'), '# fixture');
    await mkdir(join(gitRepoDir, '.cursor/rules'), { recursive: true });

    // Fixture 2: a plain non-git dir carrying an OT manifest with identity ids.
    plainDir = join(fixturesRoot, 'plain-dir');
    await mkdir(join(plainDir, '.openthrottle'), { recursive: true });
    await writeFile(
      join(plainDir, '.openthrottle/workspace-editors.json'),
      JSON.stringify({
        appliedAt: '2026-07-24T00:00:00.000Z',
        checkoutId: 'checkout-uuid',
        editor: 'cursor',
        repositoryId: 'repository-uuid',
      }),
    );
    await writeFile(join(plainDir, 'go.mod'), 'module fixture');
  }, 30_000);

  afterAll(async () => {
    await rm(fixturesRoot, { force: true, recursive: true });
  });

  describe('scan — git repo fixture', () => {
    it('detects git identity, stack, and agent config', async () => {
      const snapshot = await service.scan(gitRepoDir);

      expect(snapshot.git.isRepo).toBe(true);
      expect(snapshot.git.remotes).toEqual([
        { name: 'origin', url: 'git@github.com:OpenThrottle/fixture.git' },
      ]);
      expect(snapshot.git.normalizedRemoteUrl).toBe(
        'https://github.com/OpenThrottle/fixture',
      );
      expect(snapshot.git.linkedWorktrees).toEqual([]);

      expect(snapshot.stack.nxWorkspace).toBe(true);
      expect(snapshot.stack.packageManager).toBe('pnpm');
      expect(snapshot.stack.pnpmWorkspace).toBe(true);
      expect(snapshot.stack.turbo).toBe(false);
      expect(snapshot.stack.languages).toContain('typescript');
      expect(snapshot.stack.languages).toContain('javascript');

      expect(snapshot.agentConfig.claudeMd).toBe(true);
      expect(snapshot.agentConfig.cursorRules).toBe(true);
      expect(snapshot.agentConfig.agentsMd).toBe(false);
      expect(snapshot.agentConfig.mcpJson).toBe(false);

      expect(snapshot.manifest.present).toBe(false);
      expect(snapshot.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('scan — non-git dir with OT manifest', () => {
    it('reports no git state and reads the identity anchor', async () => {
      const snapshot = await service.scan(plainDir);

      expect(snapshot.git.isRepo).toBe(false);
      expect(snapshot.git.remotes).toEqual([]);
      expect(snapshot.git.normalizedRemoteUrl).toBeNull();
      expect(snapshot.git.dirty).toBeNull();

      expect(snapshot.manifest).toEqual({
        checkoutId: 'checkout-uuid',
        present: true,
        repositoryId: 'repository-uuid',
      });

      expect(snapshot.stack.languages).toEqual(['go']);
      expect(snapshot.stack.packageManager).toBeNull();
    });
  });

  describe('path validation before any fs access', () => {
    it('rejects relative paths', async () => {
      await expect(service.scan('relative/path')).rejects.toThrow(
        'absolute path',
      );
    });

    it('rejects missing directories', async () => {
      await expect(
        service.scan(join(tmpdir(), 'ot-inspection-does-not-exist')),
      ).rejects.toThrow('does not exist');
    });

    it('rejects NUL bytes', async () => {
      await expect(service.scan('/tmp/\0bad')).rejects.toThrow(
        'invalid characters',
      );
    });
  });

  describe('scanAndPersist', () => {
    it('persists the snapshot with its scannedAt timestamp', async () => {
      const snapshot = await service.scanAndPersist('checkout-1', plainDir);

      expect(mockCheckoutsService.saveInspection).toHaveBeenCalledWith(
        'checkout-1',
        expect.objectContaining({ manifest: snapshot.manifest }),
        new Date(snapshot.scannedAt),
      );
    });
  });
});

describe('RepositoryInspectionService hook telemetry', () => {
  const service = new RepositoryInspectionService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({ saveInspection: vi.fn() }),
  );

  let root: string;
  let fakeHome: string;
  const previous = new Map<string, string | undefined>();

  const ENV_KEYS = [
    'HOME',
    'OPENTHROTTLE_GRAPHQL_URL',
    'OPENTHROTTLE_MCP_AUTH_TOKEN',
    'OPENTHROTTLE_SERVER_APP_URL',
    'OPENTHROTTLE_TELEMETRY_OFFLINE',
    'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    'OPENTHROTTLE_WORKER_GRAPHQL_URL',
  ];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-hook-telemetry-'));
    fakeHome = join(root, 'home');
    await mkdir(fakeHome, { recursive: true });
    for (const key of ENV_KEYS) {
      previous.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.HOME = fakeHome;
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    previous.clear();
  });

  /** Give the checkout a Claude hook config so a producer is wired. */
  const wireClaude = async (): Promise<void> => {
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), '{}');
  };

  /**
   * Config an agent started by the user would actually see. The server's own
   * `process.env` is deliberately NOT that, which is what the last test here
   * pins down.
   */
  const writeUserEnv = async (body: string): Promise<void> => {
    await mkdir(join(fakeHome, '.openthrottle'), { recursive: true });
    await writeFile(join(fakeHome, '.openthrottle/.env'), body);
  };

  it('reports not_wired when no hook config exists, whatever the endpoint', async () => {
    await writeUserEnv(
      'OPENTHROTTLE_GRAPHQL_URL=http://localhost:7231/graphql\n',
    );
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.status).toBe('not_wired');
    expect(hookTelemetry?.reason).toBe('no_producer');
    expect(hookTelemetry?.producers).toEqual([]);
    // An endpoint is still reported — it is simply not what is missing.
    expect(hookTelemetry?.endpointConfigured).toBe(true);
  });

  it('reports buffering with no_endpoint when a producer is wired but nothing resolves', async () => {
    await wireClaude();
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.status).toBe('buffering');
    expect(hookTelemetry?.reason).toBe('no_endpoint');
    expect(hookTelemetry?.endpointConfigured).toBe(false);
    expect(hookTelemetry?.endpointSource).toBe('none');
    expect(hookTelemetry?.producers).toEqual(['claude']);
  });

  it('reports recording, naming the layer that supplied the endpoint', async () => {
    await wireClaude();
    await writeUserEnv(
      'OPENTHROTTLE_GRAPHQL_URL=http://localhost:7231/graphql\nOPENTHROTTLE_MCP_AUTH_TOKEN=token\n',
    );
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.status).toBe('recording');
    expect(hookTelemetry?.reason).toBeNull();
    expect(hookTelemetry?.endpointSource).toBe('user_env');
  });

  it('reports buffering when an endpoint resolves but no auth token does', async () => {
    // Observed against a real cursor-agent run: the server answered
    // `Unauthorized` and the record fell back to the buffer, while the status
    // said "recording". Reported as buffering so the safe direction is the
    // default.
    await wireClaude();
    await writeUserEnv(
      'OPENTHROTTLE_GRAPHQL_URL=http://localhost:7231/graphql\n',
    );
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.status).toBe('buffering');
    expect(hookTelemetry?.reason).toBe('no_auth_token');
    expect(hookTelemetry?.endpointConfigured).toBe(true);
    expect(hookTelemetry?.authTokenConfigured).toBe(false);
  });

  it('reports offline as its own status, not as a misconfiguration', async () => {
    await wireClaude();
    await writeUserEnv(
      'OPENTHROTTLE_GRAPHQL_URL=http://localhost:7231/graphql\n',
    );
    process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.status).toBe('offline');
    expect(hookTelemetry?.reason).toBe('offline_flag');
  });

  it('never exposes the endpoint URL or the auth token', async () => {
    await wireClaude();
    process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://secret-host:7231/graphql';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 'super-secret';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'super-secret';
    const { hookTelemetry } = await service.scan(root);

    const serialized = JSON.stringify(hookTelemetry);
    expect(serialized).not.toContain('secret-host');
    expect(serialized).not.toContain('super-secret');
  });

  it("ignores the server's own environment, which no user-started agent sees", async () => {
    // The server is launched from the monorepo with its `.env` loaded, so its
    // process.env carries an endpoint. Counting that would claim every foreign
    // checkout is configured while an agent the user starts there resolves
    // nothing and buffers.
    await wireClaude();
    process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://server-only:7231/graphql';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'server-only-token';
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.endpointConfigured).toBe(false);
    expect(hookTelemetry?.authTokenConfigured).toBe(false);
    expect(hookTelemetry?.endpointSource).toBe('none');
    expect(hookTelemetry?.status).toBe('buffering');
    expect(hookTelemetry?.reason).toBe('no_endpoint');
  });

  it('lists every wired producer', async () => {
    await wireClaude();
    await mkdir(join(root, '.codex/hooks'), { recursive: true });
    await mkdir(join(root, '.cursor'), { recursive: true });
    await writeFile(join(root, '.cursor/hooks.json'), '{}');
    const { hookTelemetry } = await service.scan(root);

    expect(hookTelemetry?.producers).toEqual(['claude', 'codex', 'cursor']);
  });
});
