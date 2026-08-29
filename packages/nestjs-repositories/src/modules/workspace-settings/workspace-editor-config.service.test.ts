import { execFileSync, spawnSync } from 'child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMock } from '@golevelup/ts-vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  FOREIGN_SKILL_LEDGER_DIR_ENV,
  GIT_EXCLUDE_OWNER,
  HOST_WORKSPACES_DIR_ENV,
  ensureMaterialized,
  teardown,
} from '@openthrottle/openthrottle-agentic-utils';
import type { UserWorkspaceSettings } from './user-workspace-settings.entity';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import type { RepositoryCheckout } from '../repositories/repository-checkout.entity';
import { RepositoryCheckoutsService } from '../repositories/repository-checkouts.service';
import { WorkspaceEditorConfigService } from './workspace-editor-config.service';

describe('WorkspaceEditorConfigService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';
  let repositoryRoot: string;

  const mockUserWorkspaceSettingsService =
    createMock<UserWorkspaceSettingsService>();
  const mockCheckoutsService = createMock<RepositoryCheckoutsService>();

  let service: WorkspaceEditorConfigService;

  beforeEach(() => {
    repositoryRoot = mkdtempSync(join(tmpdir(), 'ot-ws-editor-'));
    mkdirSync(join(repositoryRoot, 'scripts'), { recursive: true });
    writeFileSync(
      join(repositoryRoot, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/bash\n',
    );

    vi.resetAllMocks();
    service = new WorkspaceEditorConfigService(
      createMock<LoggerService>(),
      mockUserWorkspaceSettingsService,
      mockCheckoutsService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('returns empty when no editors are enabled', async () => {
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({
        enabledEditors: [],
        userId,
      }),
    );

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    expect(results).toEqual([]);
  });

  test('writes cursor MCP config and an identity-anchored manifest for a checkout', async () => {
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({
        enabledEditors: ['cursor'],
        userId,
      }),
    );

    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.editor).toBe('cursor');
    expect(results[0]?.repositoryId).toBe(checkoutId);
    expect(results[0]?.filesWritten).toContain('.cursor/mcp.json');
    expect(results[0]?.filesWritten).toContain(
      '.openthrottle/workspace-editors.json',
    );
    expect(results[0]?.warnings).toEqual([]);

    // The manifest is the on-disk identity anchor: it must carry the repository
    // and checkout ids that RepositoryInspectionService reads back.
    const manifest: unknown = JSON.parse(
      readFileSync(
        join(repositoryRoot, '.openthrottle', 'workspace-editors.json'),
        'utf-8',
      ),
    );
    expect(manifest).toMatchObject({ checkoutId, repositoryId });
  });

  test('scopes the apply to a single checkout by id', async () => {
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({
        enabledEditors: ['cursor'],
        userId,
      }),
    );

    const otherRoot = mkdtempSync(join(tmpdir(), 'ot-ws-editor-other-'));
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
      asMock<RepositoryCheckout>({
        filesystemPath: otherRoot,
        id: '55555555-5555-4555-8555-555555555555',
        repositoryId: '66666666-6666-4666-8666-666666666666',
        userId,
      }),
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
      repositoryIds: [checkoutId],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.repositoryId).toBe(checkoutId);
  });

  test('translates the write path through the host bridge when bridge env is set', async () => {
    // The real writable dir (repositoryRoot, created in beforeEach) is the *container* view.
    // The DB stores a host-truthful path; the bridge maps host -> container at the FS boundary.
    const containerParent = join(repositoryRoot, '..');
    const repoName = repositoryRoot.slice(containerParent.length + 1);
    const hostWorkspaces = '/host/workspaces';
    const hostPath = `${hostWorkspaces}/${repoName}`;

    vi.stubEnv(HOST_WORKSPACES_DIR_ENV, hostWorkspaces);
    vi.stubEnv(CONTAINER_WORKSPACES_DIR_ENV, containerParent);

    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({
        enabledEditors: ['cursor'],
        userId,
      }),
    );
    // filesystemPath stays host-truthful (as stored in the DB).
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: hostPath,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    // Writes succeeded (no "not readable/writable" warning) because the host path was translated
    // to the real container dir, and the reported path is the translated one.
    expect(results[0]?.warnings).toEqual([]);
    expect(results[0]?.filesystemPath).toBe(repositoryRoot);
    expect(results[0]?.filesWritten).toContain('.cursor/mcp.json');
  });

  test('leaves the write path unchanged when bridge env is unset', async () => {
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({
        enabledEditors: ['cursor'],
        userId,
      }),
    );
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    // No bridge env -> identity translation -> the stored path is used verbatim.
    expect(results[0]?.filesystemPath).toBe(repositoryRoot);
    expect(results[0]?.warnings).toEqual([]);
  });
});

/**
 * Regression: applying editor config left `.openthrottle/workspace-editors.json` untracked and
 * un-excluded in the user's repo, so their `git status` showed `?? .openthrottle/` — OT residue in
 * someone else's checkout. See OT plan 5a1ac8d1.
 *
 * The second assertion is as important as the first: the MCP config the user ASKED for must stay
 * visible to git. Only OT's own bookkeeping is hidden.
 */
describe('WorkspaceEditorConfigService — foreign repo cleanliness', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';
  let repositoryRoot: string;

  const mockUserWorkspaceSettingsService =
    createMock<UserWorkspaceSettingsService>();
  const mockCheckoutsService = createMock<RepositoryCheckoutsService>();
  let service: WorkspaceEditorConfigService;

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repositoryRoot, ...args], {
      encoding: 'utf8',
    }).trim();

  const porcelain = (): string => git('status', '--porcelain');

  beforeEach(() => {
    repositoryRoot = mkdtempSync(join(tmpdir(), 'ot-ws-editor-git-'));

    // Build the whole layout BEFORE the initial commit. A file created afterwards leaves the
    // baseline dirty, and the assertions below would then pass or fail for the wrong reason
    // (learned on OT b409da6e).
    mkdirSync(join(repositoryRoot, 'scripts'), { recursive: true });
    writeFileSync(
      join(repositoryRoot, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/bash\n',
    );
    writeFileSync(join(repositoryRoot, 'README.md'), '# consumer repo\n');
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('add', '.');
    git('commit', '-q', '-m', 'init');

    vi.resetAllMocks();
    service = new WorkspaceEditorConfigService(
      createMock<LoggerService>(),
      mockUserWorkspaceSettingsService,
      mockCheckoutsService,
    );

    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({ enabledEditors: ['cursor'], userId }),
    );
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(repositoryRoot, { force: true, recursive: true });
  });

  /** True when git ignores `relativePath` (check-ignore exits 0 for ignored, 1 for not). */
  const isIgnored = (relativePath: string): boolean =>
    spawnSync('git', ['-C', repositoryRoot, 'check-ignore', '-q', relativePath])
      .status === 0;

  test("OT's own manifest never shows up in the user's git status", async () => {
    // A meaningful baseline: anything dirty here would invalidate the assertions below.
    expect(porcelain()).toBe('');

    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });

    // The manifest is written...
    expect(
      existsSync(
        join(repositoryRoot, '.openthrottle', 'workspace-editors.json'),
      ),
    ).toBe(true);
    // ...and invisible to the user's git.
    expect(isIgnored('.openthrottle/workspace-editors.json')).toBe(true);
    expect(porcelain()).not.toContain('.openthrottle');
  });

  test('applying twice does not duplicate the exclude entry', async () => {
    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });
    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });

    const exclude = readFileSync(
      join(repositoryRoot, '.git', 'info', 'exclude'),
      'utf-8',
    );
    const occurrences = exclude
      .split('\n')
      .filter((line) => line === '/.openthrottle/workspace-editors.json');
    expect(occurrences).toHaveLength(1);
  });

  test('a non-git folder is a silent skip, not a warning', async () => {
    // A registered folder need not be a git repo at all. There is nothing to hide from, so this is
    // an ordinary outcome and must not be reported as a problem to the user.
    const plainDir = mkdtempSync(join(tmpdir(), 'ot-ws-editor-plain-'));
    mkdirSync(join(plainDir, 'scripts'), { recursive: true });
    writeFileSync(
      join(plainDir, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/bash\n',
    );
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: plainDir,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    expect(results[0]?.warnings).toEqual([]);
    expect(
      existsSync(join(plainDir, '.openthrottle', 'workspace-editors.json')),
    ).toBe(true);
    rmSync(plainDir, { force: true, recursive: true });
  });

  test('an exclude-write failure warns but still applies the config', async () => {
    // Make .git/info a FILE so the helper's mkdir of that directory fails - a real filesystem
    // failure rather than a mock, exercising the catch as it would fire in the wild.
    rmSync(join(repositoryRoot, '.git', 'info'), {
      force: true,
      recursive: true,
    });
    writeFileSync(join(repositoryRoot, '.git', 'info'), 'not a directory\n');

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    // The config still landed - that is the deliverable.
    expect(existsSync(join(repositoryRoot, '.cursor', 'mcp.json'))).toBe(true);
    expect(
      existsSync(
        join(repositoryRoot, '.openthrottle', 'workspace-editors.json'),
      ),
    ).toBe(true);
    // ...and the user is told the manifest will be visible, rather than it failing silently.
    expect(results[0]?.warnings.join('\n')).toContain(
      'could not hide it from git',
    );
  });

  test('reconcile back-fills the exclude for a repo configured before the fix', async () => {
    // Simulate the pre-fix state: manifest on disk, nothing excluded.
    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });
    rmSync(join(repositoryRoot, '.git', 'info', 'exclude'), { force: true });
    expect(isIgnored('.openthrottle/workspace-editors.json')).toBe(false);
    expect(porcelain()).toContain('.openthrottle');

    mockCheckoutsService.findAll.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    await expect(service.reconcileManifestExclusions()).resolves.toBe(1);

    expect(isIgnored('.openthrottle/workspace-editors.json')).toBe(true);
    expect(porcelain()).not.toContain('.openthrottle');
    // The manifest itself is the identity anchor — reconciling must never remove it.
    expect(
      existsSync(
        join(repositoryRoot, '.openthrottle', 'workspace-editors.json'),
      ),
    ).toBe(true);
  });

  test('reconcile skips a checkout with no manifest', async () => {
    mockCheckoutsService.findAll.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);

    // No apply has run, so there is no manifest to hide.
    await expect(service.reconcileManifestExclusions()).resolves.toBe(0);
  });

  test('does NOT hide the MCP config the user asked for', async () => {
    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });

    const mcpRelativePath = '.cursor/mcp.json';
    expect(existsSync(join(repositoryRoot, mcpRelativePath))).toBe(true);

    // Deliberately NOT ignored. This file is the user's to commit or gitignore as their team
    // prefers; OT writes it because they asked for it, and must not decide its fate for them.
    // It legitimately shows as untracked - that is the user's call, not residue.
    expect(isIgnored(mcpRelativePath)).toBe(false);
    expect(porcelain()).toContain('.cursor/');
  });
});

/**
 * The clobber hazard, exercised across BOTH features against ONE repo.
 *
 * Foreign-skill injection and workspace-editors each maintain a block in the same
 * `.git/info/exclude`, and each write replaces its own block wholesale. Before blocks became
 * per-owner (OT plan 5a1ac8d1 task 1), whichever ran second silently deleted the other's — and if
 * the victim were foreign-skill injection, every injected skill would become visible again and OT
 * plan b409da6e would regress with nothing failing.
 *
 * Testing the two features separately cannot catch that. This is the test that can.
 */
describe('workspace-editors + foreign-skill injection — one repo, two exclude blocks', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const checkoutId = '44444444-4444-4444-8444-444444444444';
  const repositoryId = '22222222-2222-4222-8222-222222222222';

  let base: string;
  let repositoryRoot: string;
  let otSkills: string;
  let ledgerDir: string;
  let injectionEnv: NodeJS.ProcessEnv;

  const mockUserWorkspaceSettingsService =
    createMock<UserWorkspaceSettingsService>();
  const mockCheckoutsService = createMock<RepositoryCheckoutsService>();
  let service: WorkspaceEditorConfigService;

  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repositoryRoot, ...args], {
      encoding: 'utf8',
    }).trim();

  const isIgnored = (relativePath: string): boolean =>
    spawnSync('git', ['-C', repositoryRoot, 'check-ignore', '-q', relativePath])
      .status === 0;

  const applyEditors = async (): Promise<void> => {
    await service.applyForUser(userId, { apiBaseUrl: 'http://localhost:6021' });
  };

  const injectSkills = (): void => {
    ensureMaterialized({
      env: injectionEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repositoryRoot,
    });
  };

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-two-blocks-'));
    repositoryRoot = join(base, 'repo');
    otSkills = join(base, 'ot-skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repositoryRoot, { recursive: true });
    // Deliberately a name that is NOT in OPENTHROTTLE_REPO_SKILL_PATHS. Applying editor config
    // pre-creates empty `.agents/skills/<slug>/` dirs for every slug in that list, and
    // foreign-skill injection reads those as skills the TARGET repo owns and refuses to inject
    // them. That is a real, separate bug (see this plan's output for task 4) — using one of those
    // slugs here would make this test fail for that reason instead of measuring the clobber
    // invariant it exists for.
    mkdirSync(join(otSkills, 'demo-skill'), { recursive: true });
    writeFileSync(
      join(otSkills, 'demo-skill', 'SKILL.md'),
      '---\nname: demo-skill\ndescription: The demo-skill skill\n---\n\n# demo-skill\n',
    );

    // Whole layout committed before anything runs, so a dirty result means something.
    mkdirSync(join(repositoryRoot, 'scripts'), { recursive: true });
    writeFileSync(
      join(repositoryRoot, 'scripts', 'run-openthrottle-mcp.sh'),
      '#!/bin/bash\n',
    );
    writeFileSync(join(repositoryRoot, 'README.md'), '# consumer repo\n');
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('add', '.');
    git('commit', '-q', '-m', 'init');

    injectionEnv = {
      ...process.env,
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: ledgerDir,
      [HOST_WORKSPACES_DIR_ENV]: '',
    };

    vi.resetAllMocks();
    service = new WorkspaceEditorConfigService(
      createMock<LoggerService>(),
      mockUserWorkspaceSettingsService,
      mockCheckoutsService,
    );
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue(
      asMock<UserWorkspaceSettings>({ enabledEditors: ['cursor'], userId }),
    );
    mockCheckoutsService.listByUserId.mockResolvedValue([
      asMock<RepositoryCheckout>({
        filesystemPath: repositoryRoot,
        id: checkoutId,
        repositoryId,
        userId,
      }),
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(base, { force: true, recursive: true });
  });

  test.each([
    ['skills first', true],
    ['editors first', false],
  ])(
    'both features keep their exclusions (%s)',
    async (_label, skillsFirst) => {
      if (skillsFirst) {
        injectSkills();
        await applyEditors();
      } else {
        await applyEditors();
        injectSkills();
      }

      // Neither feature lost its block to the other.
      expect(isIgnored('.agents/skills/demo-skill')).toBe(true);
      expect(isIgnored('.claude/skills/demo-skill')).toBe(true);
      expect(isIgnored('.openthrottle/workspace-editors.json')).toBe(true);

      // Nothing OT wrote for its own bookkeeping is visible to the user. `.cursor/` IS visible,
      // and correctly so - it is the editor config they asked for (see the sibling describe).
      const status = git('status', '--porcelain');
      expect(status).not.toContain('.openthrottle');
      expect(status).not.toContain('.agents');
      expect(status).not.toContain('skills');

      // Two distinct managed blocks, not one clobbering the other.
      const exclude = readFileSync(
        join(repositoryRoot, '.git', 'info', 'exclude'),
        'utf-8',
      );
      expect(exclude).toContain(
        `# BEGIN OpenThrottle ${GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION} (managed — do not edit)`,
      );
      expect(exclude).toContain(
        `# BEGIN OpenThrottle ${GIT_EXCLUDE_OWNER.WORKSPACE_EDITORS} (managed — do not edit)`,
      );
    },
  );

  test('tearing down the skill layer leaves the editors block intact', async () => {
    injectSkills();
    await applyEditors();

    teardown({ env: injectionEnv, repoPath: repositoryRoot });

    // The skill block and its entries are gone...
    const exclude = readFileSync(
      join(repositoryRoot, '.git', 'info', 'exclude'),
      'utf-8',
    );
    expect(exclude).not.toContain(
      `# BEGIN OpenThrottle ${GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION}`,
    );
    // ...while the editors block survives, still hiding the manifest.
    expect(exclude).toContain(
      `# BEGIN OpenThrottle ${GIT_EXCLUDE_OWNER.WORKSPACE_EDITORS}`,
    );
    expect(isIgnored('.openthrottle/workspace-editors.json')).toBe(true);
    expect(git('status', '--porcelain')).not.toContain('.openthrottle');
  });
});
