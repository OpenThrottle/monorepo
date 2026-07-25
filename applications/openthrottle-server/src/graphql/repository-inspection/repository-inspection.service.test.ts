import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
