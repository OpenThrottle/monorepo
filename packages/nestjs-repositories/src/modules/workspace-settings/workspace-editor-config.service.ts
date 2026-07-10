/**
 * @description Applies workspace editor preferences to linked local repository paths.
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { constants } from 'fs';
import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
import {
  OPENTHROTTLE_REPO_SKILL_PATHS,
  type RepoSkillPathLayout,
} from './openthrottle-repo-skill-paths';
import type { WorkspaceEditorId } from './workspace-editor-id';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import { WorkspaceLocalRepositoriesService } from './workspace-local-repositories.service';
import {
  getWorkspaceEditorConfigPaths,
  OPENTHROTTLE_MANIFEST_RELATIVE_PATH,
} from './workspace-editor-config-paths';
import {
  buildManagedMcpServers,
  mergeManagedMcpServers,
  type McpServersJson,
} from './workspace-editor-mcp-config';

export interface ApplyWorkspaceEditorConfigOptions {
  readonly apiBaseUrl: string;
  readonly repositoryIds?: readonly string[];
}

export interface WorkspaceEditorConfigApplication {
  readonly editor: WorkspaceEditorId;
  readonly filesWritten: readonly string[];
  readonly filesystemPath: string;
  readonly repositoryId: string;
  readonly warnings: readonly string[];
}

const layoutForEditor = (editorId: WorkspaceEditorId): RepoSkillPathLayout =>
  editorId === 'cursor' ? 'cursor' : 'agents';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonFile = (raw: string): McpServersJson => {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    return {};
  }
  const { mcpServers } = parsed;
  return {
    ...parsed,
    mcpServers: isRecord(mcpServers)
      ? Object.fromEntries(
          Object.entries(mcpServers).filter(
            (entry): entry is [string, Record<string, unknown>] =>
              isRecord(entry[1]),
          ),
        )
      : undefined,
  };
};

@Injectable()
export class WorkspaceEditorConfigService {
  constructor(
    private readonly logger: LoggerService,
    private readonly userWorkspaceSettingsService: UserWorkspaceSettingsService,
    private readonly workspaceLocalRepositoriesService: WorkspaceLocalRepositoriesService,
  ) {
    this.logger.debug('🧩 workspace-editor-config 🧩');
  }

  /**
   * @description Writes MCP config, skills manifest, and rules directory stubs for enabled editors.
   */
  async applyForUser(
    userId: string,
    options: ApplyWorkspaceEditorConfigOptions,
  ): Promise<readonly WorkspaceEditorConfigApplication[]> {
    const profile =
      await this.userWorkspaceSettingsService.getOrCreateForUser(userId);
    const enabledEditors = profile.enabledEditors;

    if (enabledEditors.length === 0) {
      return [];
    }

    const repositories =
      await this.workspaceLocalRepositoriesService.listByUserId(userId);
    const targetRepositories =
      options.repositoryIds == null || options.repositoryIds.length === 0
        ? repositories
        : repositories.filter((repo) =>
            options.repositoryIds?.includes(repo.id),
          );

    const results: WorkspaceEditorConfigApplication[] = [];

    for (const repository of targetRepositories) {
      for (const editor of enabledEditors) {
        results.push(
          // eslint-disable-next-line no-await-in-loop
          await this.applyForRepositoryEditor({
            apiBaseUrl: options.apiBaseUrl,
            editor,
            filesystemPath: repository.filesystemPath,
            repositoryId: repository.id,
          }),
        );
      }
    }

    return results;
  }

  private async applyForRepositoryEditor(params: {
    readonly apiBaseUrl: string;
    readonly editor: WorkspaceEditorId;
    readonly filesystemPath: string;
    readonly repositoryId: string;
  }): Promise<WorkspaceEditorConfigApplication> {
    const filesWritten: string[] = [];
    const warnings: string[] = [];
    const paths = getWorkspaceEditorConfigPaths(params.editor);
    // The repository's filesystemPath is host-truthful (as stored in the DB). When the server runs
    // in a container with the workspace bridge active, translate it to the in-container mount before
    // any filesystem write so config lands at a path that exists. Identity (no-op) when the bridge
    // env (OPENTHROTTLE_HOST/CONTAINER_WORKSPACES_DIR) is unset — i.e. every host-run flow. Mirrors
    // the boundary translation in code-search.resolver / ide-engine.server.
    const repositoryRoot = toContainerPath(params.filesystemPath);

    try {
      await access(repositoryRoot, constants.R_OK | constants.W_OK);
    } catch {
      return {
        editor: params.editor,
        filesWritten: [],
        filesystemPath: repositoryRoot,
        repositoryId: params.repositoryId,
        warnings: [
          `Repository path is not readable/writable: ${repositoryRoot}`,
        ],
      };
    }

    const managedMcp = buildManagedMcpServers({
      apiBaseUrl: params.apiBaseUrl,
      repositoryRoot,
    });

    if (Object.keys(managedMcp).length === 0) {
      warnings.push(
        'Skipped MCP config: scripts/run-openthrottle-mcp.sh not found in this repository.',
      );
    } else {
      const mcpRelativePath = paths.mcpConfigRelativePath;
      const mcpAbsolutePath = join(repositoryRoot, mcpRelativePath);
      const existingRaw = await this.readOptionalFile(mcpAbsolutePath);
      const existing: McpServersJson = existingRaw
        ? parseJsonFile(existingRaw)
        : {};
      const merged = mergeManagedMcpServers(existing, managedMcp);
      await this.writeJsonFile(mcpAbsolutePath, merged);
      filesWritten.push(mcpRelativePath);
    }

    await mkdir(join(repositoryRoot, paths.rulesDirectoryRelativePath), {
      recursive: true,
    });

    const skillPaths = OPENTHROTTLE_REPO_SKILL_PATHS.filter(
      (entry) => entry.layout === layoutForEditor(params.editor),
    ).map((entry) => entry.repoRelativePath);

    for (const skillPath of skillPaths) {
      // eslint-disable-next-line no-await-in-loop
      await mkdir(join(repositoryRoot, dirname(skillPath)), {
        recursive: true,
      });
    }

    const manifest = {
      appliedAt: new Date().toISOString(),
      editor: params.editor,
      enabledSkillPaths: skillPaths,
      mcpConfigPath: paths.mcpConfigRelativePath,
      rulesDirectory: paths.rulesDirectoryRelativePath,
    };

    const manifestAbsolutePath = join(
      repositoryRoot,
      OPENTHROTTLE_MANIFEST_RELATIVE_PATH,
    );
    await this.writeJsonFile(manifestAbsolutePath, manifest);
    filesWritten.push(OPENTHROTTLE_MANIFEST_RELATIVE_PATH);

    return {
      editor: params.editor,
      filesWritten,
      filesystemPath: repositoryRoot,
      repositoryId: params.repositoryId,
      warnings,
    };
  }

  private async readOptionalFile(absolutePath: string): Promise<string | null> {
    try {
      return await readFile(absolutePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private async writeJsonFile(
    absolutePath: string,
    value: unknown,
  ): Promise<void> {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(
      absolutePath,
      `${JSON.stringify(value, null, 2)}\n`,
      'utf-8',
    );
  }
}
