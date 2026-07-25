/**
 * @description CRUD for repository_checkouts scoped to the authenticated user.
 * Rows are a cache over on-disk state; inspection snapshots persist here.
 */

import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository as OrmRepository } from 'typeorm';
import { isUniqueViolation } from '../../common/unique-violation';
import {
  type ListPaginationInput,
  resolveListPagination,
} from '../../common/list-pagination';
import {
  RepositoryCheckout,
  type RepositoryCheckoutKind,
} from './repository-checkout.entity';

interface CreateRepositoryCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly kind?: RepositoryCheckoutKind;
  readonly managed?: boolean;
  readonly repositoryId: string;
}

const DUPLICATE_PATH_MESSAGE =
  'A local repository with this filesystem path is already registered';

@Injectable()
export class RepositoryCheckoutsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(RepositoryCheckout)
    private readonly repository: OrmRepository<RepositoryCheckout>,
  ) {
    this.logger.debug('🧩 repository-checkouts 🧩');
  }

  /**
   * @description Lists checkouts for a user, newest first, with the repository
   * relation loaded. Accepts optional clamped `{ limit, offset }` bounds.
   */
  async listByUserId(
    userId: string,
    pagination?: ListPaginationInput,
  ): Promise<RepositoryCheckout[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.repository.find({
      order: { createdAt: 'DESC' },
      relations: { repository: true },
      skip,
      take,
      where: { userId },
    });
  }

  /**
   * @description Finds a checkout by id when owned by the user, with the
   * repository relation loaded.
   */
  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<RepositoryCheckout | null> {
    return this.repository.findOne({
      relations: { repository: true },
      where: { id, userId },
    });
  }

  /**
   * @description Counts checkouts pointing at a repository (any user).
   */
  async countByRepositoryId(repositoryId: string): Promise<number> {
    return this.repository.count({ where: { repositoryId } });
  }

  /**
   * @description Creates a checkout row for the user. Throws ConflictException
   * when the (user, filesystem path) pair is already registered.
   */
  async create(
    userId: string,
    data: CreateRepositoryCheckoutData,
  ): Promise<RepositoryCheckout> {
    const entity = this.repository.create({
      displayName: data.displayName,
      filesystemPath: data.filesystemPath,
      kind: data.kind ?? 'primary',
      managed: data.managed ?? false,
      repositoryId: data.repositoryId,
      userId,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_PATH_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * @description Updates the display name of an owned checkout. Returns null
   * when not found.
   */
  async updateDisplayName(
    userId: string,
    id: string,
    displayName: string,
  ): Promise<RepositoryCheckout | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    existing.displayName = displayName;
    return this.repository.save(existing);
  }

  /**
   * @description Moves an owned checkout to a new filesystem path (manifest
   * reconciliation of a moved folder). Throws ConflictException when the
   * (user, path) pair is already registered; returns null when not found.
   */
  async updateFilesystemPath(
    userId: string,
    id: string,
    filesystemPath: string,
  ): Promise<RepositoryCheckout | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    existing.filesystemPath = filesystemPath;
    try {
      return await this.repository.save(existing);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_PATH_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * @description Re-points an owned checkout at a different repository row
   * (provisional→canonical moves). Returns null when not found.
   */
  async repointRepository(
    userId: string,
    id: string,
    repositoryId: string,
  ): Promise<RepositoryCheckout | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;
    existing.repositoryId = repositoryId;
    return this.repository.save(existing);
  }

  /**
   * @description Persists an inspection snapshot with its scan timestamp.
   * Returns null when the checkout does not exist.
   */
  async saveInspection(
    id: string,
    inspection: Record<string, unknown>,
    scannedAt: Date,
  ): Promise<RepositoryCheckout | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) return null;
    existing.inspection = inspection;
    existing.scannedAt = scannedAt;
    return this.repository.save(existing);
  }

  /**
   * @description Deletes an owned checkout. Returns false when not found.
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
