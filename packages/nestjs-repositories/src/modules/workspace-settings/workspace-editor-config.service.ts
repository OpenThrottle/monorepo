/**
 * @description Applies workspace editor preferences to linked local repository paths.
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { constants, existsSync } from 'fs';
import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  GIT_EXCLUDE_OWNER,
  toContainerPath,
  writeManagedExcludeBlock,
} from '@openthrottle/openthrottle-agentic-utils';
import { OPENTHROTTLE_REPO_SKILL_PATHS } from './openthrottle-repo-skill-paths';
import type { WorkspaceEditorId } from './workspace-editor-id';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';
import { RepositoryCheckoutsService } from '../repositories/repository-checkouts.service';
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
  /**
   * Scope the apply to specific checkouts by their id. Empty/undefined applies
   * to every checkout the user owns (unchanged apply-all behavior). The field
   * name is `repositoryIds` for GraphQL-contract stability; the ids are
   * checkout ids (a checkout is the per-user on-disk instance being configured).
   */
  readonly repositoryIds?: readonly string[];
}

export interface WorkspaceEditorConfigApplication {
  readonly editor: WorkspaceEditorId;
  readonly filesWritten: readonly string[];
  readonly filesystemPath: string;
  /** Checkout id the config was applied to (stable external contract). */
  readonly repositoryId: string;
  readonly warnings: readonly string[];
}

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
    private readonly checkoutsService: RepositoryCheckoutsService,
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

    const checkouts = await this.checkoutsService.listByUserId(userId);
    const targetCheckouts =
      options.repositoryIds == null || options.repositoryIds.length === 0
        ? checkouts
        : checkouts.filter((checkout) =>
            options.repositoryIds?.includes(checkout.id),
          );

    const results: WorkspaceEditorConfigApplication[] = [];

    for (const checkout of targetCheckouts) {
      for (const editor of enabledEditors) {
        results.push(
          // eslint-disable-next-line no-await-in-loop
          await this.applyForRepositoryEditor({
            apiBaseUrl: options.apiBaseUrl,
            checkoutId: checkout.id,
            editor,
            filesystemPath: checkout.filesystemPath,
            repositoryId: checkout.repositoryId,
          }),
        );
      }
    }

    return results;
  }

  private async applyForRepositoryEditor(params: {
    readonly apiBaseUrl: string;
    readonly checkoutId: string;
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
        repositoryId: params.checkoutId,
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

    const skillPaths = OPENTHROTTLE_REPO_SKILL_PATHS.map(
      (entry) => entry.repoRelativePath,
    );

    for (const skillPath of skillPaths) {
      // eslint-disable-next-line no-await-in-loop
      await mkdir(join(repositoryRoot, dirname(skillPath)), {
        recursive: true,
      });
    }

    // repositoryId + checkoutId make this manifest OT's on-disk identity anchor
    // (design decision 2): RepositoryInspectionService reads them back to
    // reconcile a moved or re-added folder to its existing rows.
    const manifest = {
      appliedAt: new Date().toISOString(),
      checkoutId: params.checkoutId,
      editor: params.editor,
      enabledSkillPaths: skillPaths,
      mcpConfigPath: paths.mcpConfigRelativePath,
      repositoryId: params.repositoryId,
      rulesDirectory: paths.rulesDirectoryRelativePath,
    };

    const manifestAbsolutePath = join(
      repositoryRoot,
      OPENTHROTTLE_MANIFEST_RELATIVE_PATH,
    );
    await this.writeJsonFile(manifestAbsolutePath, manifest);
    filesWritten.push(OPENTHROTTLE_MANIFEST_RELATIVE_PATH);

    // The manifest is OT's own bookkeeping, not something the user asked for, so hide it from their
    // `git status` via the repo-local (untracked) `.git/info/exclude`. Everything else written above
    // — the MCP config, the rules directory — IS what they asked for and deliberately stays visible:
    // it is theirs to commit or ignore as their team prefers.
    this.excludeManifestFromGit(repositoryRoot, warnings);

    return {
      editor: params.editor,
      filesWritten,
      filesystemPath: repositoryRoot,
      repositoryId: params.checkoutId,
      warnings,
    };
  }

  /**
   * @description Boot reconcile: back-fills the exclude entry in every registered checkout that
   * already carries a manifest, and returns how many were reconciled.
   *
   * The fix above only runs when editor config is applied. Repos configured before it existed carry
   * an un-excluded manifest and would stay dirty until the user happened to re-apply — which they
   * have no reason to do, and no way to know they should. This closes that gap without touching the
   * manifest itself: it is the identity anchor RepositoryInspectionService reads to reconcile a
   * moved folder, so healing must never delete or rewrite it.
   *
   * Idempotent and per-checkout soft-fail. Writes nothing in a repo that has no manifest.
   */
  async reconcileManifestExclusions(): Promise<number> {
    const checkouts = await this.checkoutsService.findAll();
    let reconciled = 0;

    for (const checkout of checkouts) {
      const repositoryRoot = toContainerPath(checkout.filesystemPath);
      if (
        !existsSync(join(repositoryRoot, OPENTHROTTLE_MANIFEST_RELATIVE_PATH))
      ) {
        continue;
      }

      const warnings: string[] = [];
      this.excludeManifestFromGit(repositoryRoot, warnings);
      for (const warning of warnings) {
        this.logger.warn(
          `Workspace-editors manifest reconcile: ${warning}`,
          WorkspaceEditorConfigService.name,
        );
      }
      reconciled += 1;
    }

    return reconciled;
  }

  /**
   * @description Adds the manifest to the repo's managed exclude block, under the workspace-editors
   * owner so it cannot disturb the block foreign-skill injection maintains in the same file.
   *
   * Never throws. A non-git folder is a legitimate target here (the user may register any directory),
   * so that case is a silent skip rather than a warning. A genuine write failure degrades to a
   * warning on the result the UI already surfaces: the editor config itself is valid and applying it
   * should not fail because one line could not be written to `.git/info/exclude`.
   */
  private excludeManifestFromGit(
    repositoryRoot: string,
    warnings: string[],
  ): void {
    try {
      writeManagedExcludeBlock(
        repositoryRoot,
        [OPENTHROTTLE_MANIFEST_RELATIVE_PATH],
        GIT_EXCLUDE_OWNER.WORKSPACE_EDITORS,
      );
    } catch (error) {
      warnings.push(
        `Wrote ${OPENTHROTTLE_MANIFEST_RELATIVE_PATH} but could not hide it from git: ${
          error instanceof Error ? error.message : String(error)
        }. It will show as an untracked file.`,
      );
    }
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
