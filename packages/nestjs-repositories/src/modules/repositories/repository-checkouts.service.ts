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

interface UpsertWorktreeCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
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
   * @description Finds a checkout by id without a user scope. For resolving a
   * checkout a row already authoritatively references (e.g. plan_runs.checkout_id
   * for run provenance / editor deep-links), where the owning user is implied by
   * the referencing row rather than the caller. Returns null when not found.
   */
  async findById(id: string): Promise<RepositoryCheckout | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * @description Resolves the checkout a run is executing in from its
   * `(userId, filesystemPath)` pair — the DB's uniqueness key. Used by the
   * foreign-skill injection gate to read the per-user opt-in flag for the exact
   * on-disk path the run touches. Returns null when the path is not a registered
   * checkout for the user (treated as opt-out).
   */
  async findByUserAndPath(
    userId: string,
    filesystemPath: string,
  ): Promise<RepositoryCheckout | null> {
    return this.repository.findOne({ where: { filesystemPath, userId } });
  }

  /**
   * @description Counts checkouts pointing at a repository (any user).
   */
  async countByRepositoryId(repositoryId: string): Promise<number> {
    return this.repository.count({ where: { repositoryId } });
  }

  /**
   * @description Lists a user's checkouts of a given repository, newest first,
   * with the repository relation loaded. Used to resolve a portable
   * `repositoryId` run-config reference to the enqueuing user's checkout.
   */
  async findByRepositoryIdForUser(
    repositoryId: string,
    userId: string,
  ): Promise<RepositoryCheckout[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      relations: { repository: true },
      where: { repositoryId, userId },
    });
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
   * @description Idempotently records a worktree checkout (kind='worktree',
   * managed=true) at `filesystemPath` for the user — the durable on-disk home a
   * run's `plan_runs.checkout_id` references for editor deep-links. Keyed on the
   * DB's `(user_id, filesystem_path)` uniqueness so re-provisioning the same
   * worktree returns the existing row rather than duplicating it, and normalizes
   * a pre-existing row at that path up to a managed worktree (e.g. a bare
   * `git worktree add` folder later provisioned for a run). Reusable primitive
   * for worktree-provisioning entry points.
   */
  async upsertWorktreeCheckout(
    userId: string,
    data: UpsertWorktreeCheckoutData,
  ): Promise<RepositoryCheckout> {
    const existing = await this.repository.findOne({
      where: { filesystemPath: data.filesystemPath, userId },
    });

    if (existing) {
      // Normalize an existing row at this path to a managed worktree, and adopt
      // the resolved repository if it drifted (provisional -> canonical). No-op
      // when already aligned, keeping repeat provisioning writes cheap.
      const needsUpdate =
        existing.kind !== 'worktree' ||
        existing.managed !== true ||
        existing.repositoryId !== data.repositoryId;
      if (!needsUpdate) {
        return existing;
      }
      existing.kind = 'worktree';
      existing.managed = true;
      existing.repositoryId = data.repositoryId;
      return this.repository.save(existing);
    }

    try {
      return await this.repository.save(
        this.repository.create({
          displayName: data.displayName,
          filesystemPath: data.filesystemPath,
          kind: 'worktree',
          managed: true,
          repositoryId: data.repositoryId,
          userId,
        }),
      );
    } catch (error) {
      // Lost a race to a concurrent provisioning of the same path: the row now
      // exists, so return it instead of surfacing the unique violation.
      if (isUniqueViolation(error)) {
        const raced = await this.repository.findOne({
          where: { filesystemPath: data.filesystemPath, userId },
        });
        if (raced) {
          return raced;
        }
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
   * @description Sets the per-user foreign-skill injection opt-in for every one
   * of the user's checkouts of a repository (primary + any worktrees flip
   * together, keeping the repository-level toggle consistent). Returns the number
   * of rows updated (0 when the user owns no checkout of the repository).
   */
  async setForeignSkillInjectionEnabledForRepository(
    userId: string,
    repositoryId: string,
    enabled: boolean,
  ): Promise<number> {
    const result = await this.repository.update(
      { repositoryId, userId },
      { foreignSkillInjectionEnabled: enabled },
    );
    return result.affected ?? 0;
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
