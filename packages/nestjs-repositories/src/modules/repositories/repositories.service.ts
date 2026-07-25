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

interface CreateRepositoryData {
  readonly defaultBranch: string | null;
  readonly name: string;
  readonly normalizedRemoteUrl: string | null;
  readonly projectId: string | null;
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
   * @description Deletes a repository row. Returns false when not found.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
