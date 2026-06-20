import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMock } from '@golevelup/ts-vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import type { UserWorkspaceSettings } from './user-workspace-settings.entity';
import type { WorkspaceLocalRepository } from './workspace-local-repository.entity';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';
import { WorkspaceEditorConfigService } from './workspace-editor-config.service';

describe('WorkspaceEditorConfigService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  let repositoryRoot: string;

  const mockUserWorkspaceSettingsService =
    createMock<UserWorkspaceSettingsService>();
  const mockWorkspaceLocalRepositoriesService =
    createMock<WorkspaceLocalRepositoriesService>();

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
      mockWorkspaceLocalRepositoriesService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('returns empty when no editors are enabled', async () => {
    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue({
      enabledEditors: [],
      userId,
    } as unknown as UserWorkspaceSettings);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    expect(results).toEqual([]);
  });

  test('writes cursor MCP config and manifest for linked repo', async () => {
    const repoId = '22222222-2222-4222-8222-222222222222';

    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue({
      enabledEditors: ['cursor'],
      userId,
    } as UserWorkspaceSettings);

    mockWorkspaceLocalRepositoriesService.listByUserId.mockResolvedValue([
      {
        filesystemPath: repositoryRoot,
        id: repoId,
        userId,
      } as WorkspaceLocalRepository,
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.editor).toBe('cursor');
    expect(results[0]?.filesWritten).toContain('.cursor/mcp.json');
    expect(results[0]?.filesWritten).toContain(
      '.openthrottle/workspace-editors.json',
    );
    expect(results[0]?.warnings).toEqual([]);
  });

  test('translates the write path through the host bridge when bridge env is set', async () => {
    const repoId = '33333333-3333-4333-8333-333333333333';
    // The real writable dir (repositoryRoot, created in beforeEach) is the *container* view.
    // The DB stores a host-truthful path; the bridge maps host -> container at the FS boundary.
    const containerParent = join(repositoryRoot, '..');
    const repoName = repositoryRoot.slice(containerParent.length + 1);
    const hostWorkspaces = '/host/workspaces';
    const hostPath = `${hostWorkspaces}/${repoName}`;

    vi.stubEnv(HOST_WORKSPACES_DIR_ENV, hostWorkspaces);
    vi.stubEnv(CONTAINER_WORKSPACES_DIR_ENV, containerParent);

    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue({
      enabledEditors: ['cursor'],
      userId,
    } as UserWorkspaceSettings);
    // filesystemPath stays host-truthful (as stored in the DB).
    mockWorkspaceLocalRepositoriesService.listByUserId.mockResolvedValue([
      {
        filesystemPath: hostPath,
        id: repoId,
        userId,
      } as WorkspaceLocalRepository,
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
    const repoId = '44444444-4444-4444-8444-444444444444';

    mockUserWorkspaceSettingsService.getOrCreateForUser.mockResolvedValue({
      enabledEditors: ['cursor'],
      userId,
    } as UserWorkspaceSettings);
    mockWorkspaceLocalRepositoriesService.listByUserId.mockResolvedValue([
      {
        filesystemPath: repositoryRoot,
        id: repoId,
        userId,
      } as WorkspaceLocalRepository,
    ]);

    const results = await service.applyForUser(userId, {
      apiBaseUrl: 'http://localhost:6021',
    });

    // No bridge env -> identity translation -> the stored path is used verbatim.
    expect(results[0]?.filesystemPath).toBe(repositoryRoot);
    expect(results[0]?.warnings).toEqual([]);
  });
});
