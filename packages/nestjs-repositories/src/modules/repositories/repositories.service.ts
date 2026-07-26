/**
 * @description CRUD and find-or-create for repositories (identity = normalized
 * git remote URL; provisional rows carry NULL until a remote is detected).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository as OrmRepository } from 'typeorm';
import { normalizeRemoteUrl } from './normalize-remote-url';
import { Repository } from './repository.entity';
import { RepositoryCheckout } from './repository-checkout.entity';

interface CreateRepositoryData {
  readonly defaultBranch: string | null;
  readonly name: string;
  readonly normalizedRemoteUrl: string | null;
  readonly projectId: string | null;
}

export interface MergeDetectedRemoteResult {
  /** True when the provisional row merged into an existing canonical row. */
  readonly merged: boolean;
  /** The surviving repository (canonical on merge, promoted otherwise). */
  readonly repository: Repository;
  /** Project link dropped from the provisional row on merge (canonical wins). */
  readonly supersededProjectId: string | null;
}

interface UpdateRepositoryData {
  readonly defaultBranch?: string | null;
  readonly name?: string;
  readonly normalizedRemoteUrl?: string | null;
  readonly projectId?: string | null;
}

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Repository)
    private readonly repository: OrmRepository<Repository>,
  ) {
    this.logger.debug('🧩 repositories 🧩');
  }

  /**
   * @description Finds a repository by id.
   */
  async findById(id: string): Promise<Repository | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * @description Finds the canonical repository for a normalized remote URL.
   */
  async findByNormalizedRemoteUrl(
    normalizedRemoteUrl: string,
  ): Promise<Repository | null> {
    return this.repository.findOne({ where: { normalizedRemoteUrl } });
  }

  /**
   * @description Creates a repository row; pass normalizedRemoteUrl null for a
   * provisional local-only repository.
   */
  async create(data: CreateRepositoryData): Promise<Repository> {
    const entity = this.repository.create({
      defaultBranch: data.defaultBranch,
      name: data.name,
      normalizedRemoteUrl: data.normalizedRemoteUrl,
      projectId: data.projectId,
    });
    return this.repository.save(entity);
  }

  /**
   * @description Resolves a raw remote URL to its canonical repository row,
   * creating one when none exists. A null/unrecognizable URL creates a fresh
   * provisional repository (no identity to dedupe on). When the row already
   * exists its fields win; `defaults` only seed a newly created row.
   */
  async findOrCreateByRemoteUrl(
    rawRemoteUrl: string | null,
    defaults: Omit<CreateRepositoryData, 'normalizedRemoteUrl'>,
  ): Promise<Repository> {
    const normalizedRemoteUrl =
      rawRemoteUrl === null ? null : normalizeRemoteUrl(rawRemoteUrl);

    if (normalizedRemoteUrl !== null) {
      const existing =
        await this.findByNormalizedRemoteUrl(normalizedRemoteUrl);
      if (existing) return existing;
    }

    return this.create({ ...defaults, normalizedRemoteUrl });
  }

  /**
   * @description Updates repository fields by id. Returns null when not found.
   */
  async update(
    id: string,
    data: UpdateRepositoryData,
  ): Promise<Repository | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (data.defaultBranch !== undefined) {
      existing.defaultBranch = data.defaultBranch;
    }
    if (data.name !== undefined) {
      existing.name = data.name;
    }
    if (data.normalizedRemoteUrl !== undefined) {
      existing.normalizedRemoteUrl = data.normalizedRemoteUrl;
    }
    if (data.projectId !== undefined) {
      existing.projectId = data.projectId;
    }

    return this.repository.save(existing);
  }

  /**
   * @description Resolves a provisional repository that gained a remote
   * (design doc §4): merge into the existing canonical row when one matches
   * (all checkouts re-point, the provisional row is deleted, and the
   * canonical project link wins) or promote the provisional row in place.
   * Runs in one transaction with the provisional row locked so concurrent
   * refreshes serialize. Returns null when the repository does not exist.
   */
  async mergeDetectedRemote(
    repositoryId: string,
    normalizedRemoteUrl: string,
  ): Promise<MergeDetectedRemoteResult | null> {
    return this.repository.manager.transaction(async (manager) => {
      const provisional = await manager.findOne(Repository, {
        lock: { mode: 'pessimistic_write' },
        where: { id: repositoryId },
      });
      if (!provisional) return null;
      if (provisional.normalizedRemoteUrl !== null) {
        return {
          merged: false,
          repository: provisional,
          supersededProjectId: null,
        };
      }

      const canonical = await manager.findOne(Repository, {
        where: { normalizedRemoteUrl },
      });
      if (canonical) {
        await manager.update(
          RepositoryCheckout,
          { repositoryId },
          { repositoryId: canonical.id },
        );
        await manager.delete(Repository, { id: repositoryId });
        return {
          merged: true,
          repository: canonical,
          supersededProjectId: provisional.projectId,
        };
      }

      provisional.normalizedRemoteUrl = normalizedRemoteUrl;
      const promoted = await manager.save(provisional);
      return { merged: false, repository: promoted, supersededProjectId: null };
    });
  }

  /**
   * @description Deletes a repository row. Returns false when not found.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
