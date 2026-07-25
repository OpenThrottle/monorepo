import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createMock } from '@golevelup/ts-vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
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
