/**
 * @description Server-side pipeline for the add-folder onboarding gesture
 * (design doc §3/§6/§8): discovery under configured workspace roots,
 * allowlist-scoped directory browsing, the converging
 * validate → inspect → reconcile → finalize flow, and refresh-with-drift.
 * Discovery is opt-in: with OPENTHROTTLE_WORKSPACE_ROOTS unset it returns
 * nothing; addWorkspaceFolder keeps the explicit-path escape hatch.
 */

import { existsSync, realpathSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Repository,
  RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectsService,
  RepositoriesService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import {
  toContainerPath,
  toHostPath,
} from '@openthrottle/openthrottle-agentic-utils';
import { RepositoryInspectionService } from '../repository-inspection/repository-inspection.service';
import type { RepositoryInspectionSnapshot } from '../repository-inspection/repository-inspection.snapshot';
import type {
  RepositoryCheckoutObject,
  RepositoryInspectionObject,
  RepositoryObject,
} from './repository.object';
import type {
  AddWorkspaceFolderPayloadObject,
  BrowseDirectoryEntryObject,
  CheckoutDriftObject,
  DiscoveredFolderObject,
  RefreshCheckoutPayloadObject,
} from './workspace-folders.object';
import { WorkspaceFolderReconciliationEnum } from './workspace-folders.object';

/** Env var: comma-separated absolute host-view paths scanned for candidates. */
export const WORKSPACE_ROOTS_ENV = 'OPENTHROTTLE_WORKSPACE_ROOTS';

/** Inspection snapshots older than this re-scan on view (design doc §5). */
const INSPECTION_TTL_MS = 15 * 60 * 1000;

/**
 * Workspace roots in this process's view. Empty when unset — proactive
 * discovery is opt-in, unlike targeted enqueue validation (design doc §6).
 */
export const getWorkspaceRoots = (
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] => {
  const raw = env[WORKSPACE_ROOTS_ENV];
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((path) => toContainerPath(path.trim(), env))
    .filter((path) => path.length > 0 && isAbsolute(path));
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Structural check for snapshots read back from the JSONB cache. */
const isInspectionSnapshot = (
  value: unknown,
): value is RepositoryInspectionSnapshot =>
  isJsonObject(value) &&
  isJsonObject(value.agentConfig) &&
  isJsonObject(value.git) &&
  isJsonObject(value.stack) &&
  typeof value.scannedAt === 'string';

const toInspectionObject = (
  snapshot: RepositoryInspectionSnapshot,
): RepositoryInspectionObject => ({
  agentConfig: { ...snapshot.agentConfig },
  git: {
    currentBranch: snapshot.git.currentBranch,
    defaultBranch: snapshot.git.defaultBranch,
    dirty: snapshot.git.dirty,
    isRepo: snapshot.git.isRepo,
    linkedWorktrees: snapshot.git.linkedWorktrees,
    normalizedRemoteUrl: snapshot.git.normalizedRemoteUrl,
  },
  scannedAt: new Date(snapshot.scannedAt),
  stack: { ...snapshot.stack },
  warnings: snapshot.warnings,
});

/** Last path segment of a normalized remote URL, for repository naming. */
const repositoryNameFromRemote = (normalizedRemoteUrl: string): string | null =>
  normalizedRemoteUrl.split('/').filter(Boolean).pop() ?? null;

@Injectable()
export class WorkspaceFoldersService {
  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly inspectionService: RepositoryInspectionService,
    private readonly projectsService: ProjectsService,
    private readonly repositoriesService: RepositoriesService,
  ) {
    this.logger.debug('🧩 workspace-folders 🧩');
  }

  /**
   * @description Shallow-scans configured workspace roots for immediate child
   * directories containing `.git`, annotated with alreadyRegistered (matched
   * by OT manifest checkout id or by path). Symlinked directories are not
   * followed; one level only.
   */
  async discoveredFolders(userId: string): Promise<DiscoveredFolderObject[]> {
    const roots = getWorkspaceRoots();
    if (roots.length === 0) return [];

    const checkouts = await this.checkoutsService.listByUserId(userId, {
      limit: 200,
    });
    const registeredPaths = new Set(
      checkouts.map((checkout) => checkout.filesystemPath),
    );
    const registeredIds = new Set(checkouts.map((checkout) => checkout.id));

    const candidates: Array<{ name: string; processPath: string }> = [];
    for (const root of roots) {
      let entries;
      try {
        // eslint-disable-next-line no-await-in-loop
        entries = await readdir(root, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        // Dirent reports symlinked dirs as symlinks, so they are skipped.
        if (!entry.isDirectory()) continue;
        const candidate = join(root, entry.name);
        if (!existsSync(join(candidate, '.git'))) continue;
        candidates.push({ name: entry.name, processPath: candidate });
      }
    }

    const discovered = await Promise.all(
      candidates.map(async ({ name, processPath }) => {
        const hostPath = toHostPath(processPath);
        let alreadyRegistered = registeredPaths.has(hostPath);
        if (!alreadyRegistered) {
          const manifest =
            await this.inspectionService.readManifestIdentity(processPath);
          alreadyRegistered =
            manifest.checkoutId !== null &&
            registeredIds.has(manifest.checkoutId);
        }
        return { alreadyRegistered, name, path: hostPath };
      }),
    );

    return discovered.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * @description Lists immediate subdirectories of a path that must resolve
   * (after symlink resolution) under a configured workspace root.
   */
  async browseDirectory(path: string): Promise<BrowseDirectoryEntryObject[]> {
    const roots = getWorkspaceRoots();
    if (roots.length === 0) {
      throw new Error(
        `browseDirectory requires ${WORKSPACE_ROOTS_ENV} to be configured`,
      );
    }

    const trimmed = path.trim();
    if (trimmed === '' || trimmed.includes('\0') || !isAbsolute(trimmed)) {
      throw new Error('browseDirectory path must be an absolute path');
    }

    const processView = toContainerPath(trimmed);
    let resolved: string;
    try {
      resolved = realpathSync(processView);
    } catch {
      throw new Error(`browseDirectory path does not exist: ${trimmed}`);
    }

    // Compare in fully-resolved space so neither a symlinked request nor a
    // symlinked root (e.g. macOS /var → /private/var) defeats the check.
    const resolvedRoots = roots.flatMap((root) => {
      try {
        return [realpathSync(root)];
      } catch {
        return [];
      }
    });
    const allowed = resolvedRoots.some(
      (root) => resolved === root || resolved.startsWith(`${root}/`),
    );
    if (!allowed) {
      throw new Error(
        'browseDirectory path is not within the configured workspace roots',
      );
    }

    const entries = await readdir(resolved, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: join(trimmed, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * @description The converging add-folder pipeline: validate + inspect the
   * path, reconcile identity (manifest checkout id → manifest repository id →
   * normalized remote → new canonical/provisional repository), create or
   * relink the checkout, persist the snapshot, and return the enriched graph.
   */
  async addWorkspaceFolder(
    userId: string,
    input: { displayName?: string | null; path: string },
  ): Promise<AddWorkspaceFolderPayloadObject> {
    const hostPath = input.path.trim();
    const snapshot = await this.inspectionService.scan(hostPath);

    const displayName =
      input.displayName == null || input.displayName.trim() === ''
        ? basename(hostPath)
        : input.displayName.trim();

    let checkout: RepositoryCheckout | null = null;
    let repository: Repository | null = null;
    let reconciliation: WorkspaceFolderReconciliationEnum =
      WorkspaceFolderReconciliationEnum.CREATED_PROVISIONAL;
    let createdRepository = false;

    // 1. Manifest checkout id: a moved or re-added folder relinks, never duplicates.
    if (snapshot.manifest.checkoutId !== null) {
      const existing = await this.checkoutsService.findByIdForUser(
        snapshot.manifest.checkoutId,
        userId,
      );
      if (existing) {
        checkout =
          existing.filesystemPath === hostPath
            ? existing
            : ((await this.checkoutsService.updateFilesystemPath(
                userId,
                existing.id,
                hostPath,
              )) ?? existing);
        repository = await this.repositoryFor(checkout);
        reconciliation =
          WorkspaceFolderReconciliationEnum.MATCHED_MANIFEST_CHECKOUT;
      }
    }

    // 2. Manifest repository id: attach a new checkout to the known repository.
    if (checkout === null && snapshot.manifest.repositoryId !== null) {
      const known = await this.repositoriesService.findById(
        snapshot.manifest.repositoryId,
      );
      if (known) {
        repository = known;
        reconciliation =
          WorkspaceFolderReconciliationEnum.MATCHED_MANIFEST_REPOSITORY;
      }
    }

    // 3. Normalized remote → existing canonical row, else create.
    if (checkout === null && repository === null) {
      const remote = snapshot.git.normalizedRemoteUrl;
      if (remote !== null) {
        const canonical =
          await this.repositoriesService.findByNormalizedRemoteUrl(remote);
        if (canonical) {
          repository = canonical;
          reconciliation = WorkspaceFolderReconciliationEnum.MATCHED_REMOTE;
        } else {
          repository = await this.repositoriesService.create({
            defaultBranch: snapshot.git.defaultBranch,
            name: repositoryNameFromRemote(remote) ?? displayName,
            normalizedRemoteUrl: remote,
            projectId: null,
          });
          reconciliation = WorkspaceFolderReconciliationEnum.CREATED_CANONICAL;
          createdRepository = true;
        }
      } else {
        repository = await this.repositoriesService.create({
          defaultBranch: snapshot.git.defaultBranch,
          name: displayName,
          normalizedRemoteUrl: null,
          projectId: null,
        });
        reconciliation = WorkspaceFolderReconciliationEnum.CREATED_PROVISIONAL;
        createdRepository = true;
      }
    }

    if (repository === null) {
      throw new NotFoundException('Repository could not be resolved');
    }

    if (checkout === null) {
      try {
        checkout = await this.checkoutsService.create(userId, {
          displayName,
          filesystemPath: hostPath,
          repositoryId: repository.id,
        });
      } catch (error) {
        if (createdRepository) {
          await this.repositoriesService.delete(repository.id);
        }
        throw error;
      }
    }

    await this.checkoutsService.saveInspection(
      checkout.id,
      { ...snapshot },
      new Date(snapshot.scannedAt),
    );

    // Auto-provision: a NEW repository gets a project named from the remote
    // repo name (fallback: folder name); existing repositories inherit their
    // link untouched (task 108bca14 / plan decision 1).
    let project =
      repository.projectId === null
        ? null
        : await this.projectsService.findById(repository.projectId);
    let projectCreated = false;
    if (createdRepository && repository.projectId === null) {
      project = await this.projectsService.create({
        description: `Auto-created by the add-folder onboarding flow for ${
          repository.normalizedRemoteUrl ?? checkout.filesystemPath
        }.`,
        name: repository.name,
      });
      const linked = await this.repositoriesService.update(repository.id, {
        projectId: project.id,
      });
      repository = linked ?? repository;
      projectCreated = true;
    }

    return {
      checkout: this.toCheckoutObject(checkout, snapshot),
      project,
      projectCreated,
      reconciliation,
      repository: this.toRepositoryObject(repository),
    };
  }

  /**
   * @description Re-runs inspection on an owned checkout and surfaces drift
   * (path missing, remote changed, branch moved) against the prior snapshot.
   */
  async refreshCheckout(
    userId: string,
    id: string,
  ): Promise<RefreshCheckoutPayloadObject> {
    const checkout = await this.checkoutsService.findByIdForUser(id, userId);
    if (!checkout) {
      throw new NotFoundException('Checkout not found');
    }

    const previous = isInspectionSnapshot(checkout.inspection)
      ? checkout.inspection
      : null;

    let snapshot: RepositoryInspectionSnapshot | null = null;
    try {
      snapshot = await this.inspectionService.scan(checkout.filesystemPath);
    } catch {
      snapshot = null;
    }

    if (snapshot !== null) {
      await this.checkoutsService.saveInspection(
        checkout.id,
        { ...snapshot },
        new Date(snapshot.scannedAt),
      );
    }

    // Provisional → canonical resolution (design doc §4): a local-only
    // repository that gained a remote merges into the canonical row (its
    // project link wins) or promotes in place.
    let repository = await this.repositoryFor(checkout);
    let merged = false;
    let supersededProjectId: string | null = null;
    if (
      snapshot !== null &&
      repository.normalizedRemoteUrl === null &&
      snapshot.git.normalizedRemoteUrl !== null
    ) {
      const result = await this.repositoriesService.mergeDetectedRemote(
        repository.id,
        snapshot.git.normalizedRemoteUrl,
      );
      if (result !== null) {
        merged = result.merged;
        repository = result.repository;
        supersededProjectId = result.supersededProjectId;
        // The row was re-pointed inside the merge transaction; reflect it on
        // the already-loaded entity so the payload is consistent.
        checkout.repositoryId = repository.id;
      }
    }

    const drift: CheckoutDriftObject = {
      branchMoved:
        previous !== null &&
        snapshot !== null &&
        previous.git.currentBranch !== snapshot.git.currentBranch,
      pathMissing: snapshot === null,
      remoteChanged:
        previous !== null &&
        snapshot !== null &&
        previous.git.normalizedRemoteUrl !== snapshot.git.normalizedRemoteUrl,
    };

    return {
      checkout: this.toCheckoutObject(checkout, snapshot ?? previous),
      drift,
      merged,
      repository: this.toRepositoryObject(repository),
      supersededProjectId,
    };
  }

  /**
   * @description The authenticated user's repositories, grouped from their
   * checkouts, with inspection snapshots refreshed on view past the TTL.
   */
  async workspaceRepositories(userId: string): Promise<RepositoryObject[]> {
    const checkouts = await this.checkoutsService.listByUserId(userId, {
      limit: 200,
    });

    const groups = new Map<
      string,
      { checkouts: RepositoryCheckoutObject[]; repository: Repository }
    >();

    for (const checkout of checkouts) {
      // eslint-disable-next-line no-await-in-loop
      const repository = await this.repositoryFor(checkout);
      // eslint-disable-next-line no-await-in-loop
      const snapshot = await this.resolveInspection(checkout);
      const group = groups.get(repository.id) ?? { checkouts: [], repository };
      group.checkouts.push(this.toCheckoutObject(checkout, snapshot));
      groups.set(repository.id, group);
    }

    return [...groups.values()]
      .map((group) => ({
        ...this.toRepositoryObject(group.repository),
        checkouts: group.checkouts,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * TTL-on-view (design doc §5): serve the stored snapshot while fresh,
   * synchronously re-scan when stale or absent, and fall back to the stored
   * one when the re-scan fails (e.g. path gone).
   */
  private async resolveInspection(
    checkout: RepositoryCheckout,
  ): Promise<RepositoryInspectionSnapshot | null> {
    const stored = isInspectionSnapshot(checkout.inspection)
      ? checkout.inspection
      : null;

    const fresh =
      checkout.scannedAt !== null &&
      Date.now() - new Date(checkout.scannedAt).getTime() < INSPECTION_TTL_MS;
    if (stored !== null && fresh) return stored;

    try {
      return await this.inspectionService.scanAndPersist(
        checkout.id,
        checkout.filesystemPath,
      );
    } catch {
      return stored;
    }
  }

  private async repositoryFor(
    checkout: RepositoryCheckout,
  ): Promise<Repository> {
    const repository =
      checkout.repository ??
      (await this.repositoriesService.findById(checkout.repositoryId));
    if (!repository) {
      throw new NotFoundException(
        `Repository not found for checkout: ${checkout.id}`,
      );
    }
    return repository;
  }

  private toCheckoutObject(
    checkout: RepositoryCheckout,
    snapshot: RepositoryInspectionSnapshot | null,
  ): RepositoryCheckoutObject {
    return {
      createdAt: checkout.createdAt,
      displayName: checkout.displayName,
      filesystemPath: checkout.filesystemPath,
      id: checkout.id,
      inspection: snapshot === null ? null : toInspectionObject(snapshot),
      kind: checkout.kind,
      managed: checkout.managed,
      repositoryId: checkout.repositoryId,
      scannedAt:
        snapshot === null ? checkout.scannedAt : new Date(snapshot.scannedAt),
      updatedAt: checkout.updatedAt,
      userId: checkout.userId,
    };
  }

  private toRepositoryObject(repository: Repository): RepositoryObject {
    return {
      checkouts: [],
      createdAt: repository.createdAt,
      defaultBranch: repository.defaultBranch,
      id: repository.id,
      name: repository.name,
      normalizedRemoteUrl: repository.normalizedRemoteUrl,
      projectId: repository.projectId,
      updatedAt: repository.updatedAt,
    };
  }
}
