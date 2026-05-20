import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
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
      join(repositoryRoot, 'scripts', 'run-mcp-developer.sh'),
      '#!/bin/bash\n',
    );

    vi.resetAllMocks();
    service = new WorkspaceEditorConfigService(
      createMock<LoggerService>(),
      mockUserWorkspaceSettingsService,
      mockWorkspaceLocalRepositoriesService,
    );
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
});
