import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ListPaginationInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  isUniqueViolation,
  resolveListPagination,
} from '@openthrottle/nestjs-postgres';
import { IsNull, Repository } from 'typeorm';

import { RepositoryCheckout } from './repository-checkout.entity.ts';
import type {
  CreateRepositoryCheckoutData,
  RepositoryCheckoutCreateInput,
  UpsertWorktreeCheckoutData,
} from './repository-checkouts.types.ts';

const DUPLICATE_PATH_MESSAGE = `A local repository with this filesystem path is already registered`;

/**
 * @description Data access for the openthrottle `repository_checkouts` table on the default
 * connection, scoped to the authenticated user where a user is involved. Rows are a cache over
 * on-disk state; inspection snapshots persist here. A delete is a soft delete, which fires none
 * of the foreign key actions: rows that reference a checkout keep its id and the checkout then
 * reads as not found; see migration 178. The inherited `findById` throws on a miss, so the
 * nullable lookup is `findCheckoutById`.
 * @public
 */
@Injectable()
export class RepositoryCheckoutsRepository extends BaseRepository<
  RepositoryCheckout,
  RepositoryCheckoutCreateInput
> {
  protected readonly tableName = 'repository_checkouts';

  constructor(
    @InjectRepository(RepositoryCheckout)
    repository: Repository<RepositoryCheckout>,
  ) {
    super(repository);
  }

  /**
   * @description Lists live checkouts for a user, newest first, with the repository
   * relation loaded. Accepts optional clamped `{ limit, offset }` bounds.
   */
  async listByUserId(
    userId: string,
    pagination?: ListPaginationInput,
  ): Promise<RepositoryCheckout[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.findBy({
      order: { createdAt: 'DESC' },
      relations: { repository: true },
      skip,
      take,
      where: { userId },
    });
  }

  /**
   * @description Finds a live checkout by id when owned by the user, with the
   * repository relation loaded.
   */
  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<RepositoryCheckout | null> {
    return this.findOne({
      relations: { repository: true },
      where: { id, userId },
    });
  }

  /**
   * @description Finds a live checkout by id without a user scope. For resolving a
   * checkout a row already authoritatively references (e.g. plan_runs.checkout_id
   * for run provenance / editor deep-links), where the owning user is implied by
   * the referencing row rather than the caller. Returns null when not found (or soft
   * deleted); the inherited `findById` throws instead.
   */
  async findCheckoutById(id: string): Promise<RepositoryCheckout | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Resolves the live checkout a run is executing in from its
   * `(userId, filesystemPath)` pair — the DB's uniqueness key. Used by the
   * foreign-skill injection gate to read the per-user opt-in flag for the exact
   * on-disk path the run touches. Returns null when the path is not a registered
   * checkout for the user (treated as opt-out).
   */
  async findByUserAndPath(
    userId: string,
    filesystemPath: string,
  ): Promise<RepositoryCheckout | null> {
    return this.findOne({ where: { filesystemPath, userId } });
  }

  /**
   * @description Every live checkout opted into foreign-skill injection, across all users. Used by the
   * boot reconcile: shutdown teardown and the boot reaper clear the injected layer, so without this
   * an opted-in repo would sit skill-less until its next run or toggle, even though the flag says
   * it should be injected.
   */
  async findAllWithForeignSkillInjectionEnabled(): Promise<
    RepositoryCheckout[]
  > {
    return this.findBy({ where: { foreignSkillInjectionEnabled: true } });
  }

  /**
   * @description Every live registered checkout, across all users. Used by the boot reconcile that
   * back-fills the git-exclude entry for OT's workspace-editors manifest in repos where editor
   * config was applied before that exclude existed.
   */
  async findAll(): Promise<RepositoryCheckout[]> {
    return this.findBy();
  }

  /**
   * @description Counts live checkouts pointing at a repository (any user).
   */
  async countByRepositoryId(repositoryId: string): Promise<number> {
    return this.repository.count({
      where: { deletedAt: IsNull(), repositoryId },
    });
  }

  /**
   * @description Lists a user's live checkouts of a given repository, newest first,
   * with the repository relation loaded. Used to resolve a portable
   * `repositoryId` run-config reference to the enqueuing user's checkout.
   */
  async findByRepositoryIdForUser(
    repositoryId: string,
    userId: string,
  ): Promise<RepositoryCheckout[]> {
    return this.findBy({
      order: { createdAt: 'DESC' },
      relations: { repository: true },
      where: { repositoryId, userId },
    });
  }

  /**
   * @description Creates a checkout row for the user. Throws ConflictException
   * when the (user, filesystem path) pair is already registered by a live checkout.
   */
  async createForUser(
    userId: string,
    data: CreateRepositoryCheckoutData,
  ): Promise<RepositoryCheckout> {
    try {
      return await this.create({
        displayName: data.displayName,
        filesystemPath: data.filesystemPath,
        kind: data.kind ?? 'primary',
        managed: data.managed ?? false,
        repositoryId: data.repositoryId,
        userId,
      });
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
   * DB's live `(user_id, filesystem_path)` uniqueness so re-provisioning the same
   * worktree returns the existing row rather than duplicating it, and normalizes
   * a pre-existing row at that path up to a managed worktree (e.g. a bare
   * `git worktree add` folder later provisioned for a run). A soft-deleted row at the
   * path is ignored, so the path gets a fresh checkout. Reusable primitive
   * for worktree-provisioning entry points.
   */
  async upsertWorktreeCheckout(
    userId: string,
    data: UpsertWorktreeCheckoutData,
  ): Promise<RepositoryCheckout> {
    const existing = await this.findByUserAndPath(userId, data.filesystemPath);

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
      return await this.create({
        displayName: data.displayName,
        filesystemPath: data.filesystemPath,
        kind: 'worktree',
        managed: true,
        repositoryId: data.repositoryId,
        userId,
      });
    } catch (error) {
      // Lost a race to a concurrent provisioning of the same path: the row now
      // exists, so return it instead of surfacing the unique violation.
      if (isUniqueViolation(error)) {
        const raced = await this.findByUserAndPath(userId, data.filesystemPath);
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  /**
   * @description Updates the display name of an owned live checkout. Returns null
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
   * @description Moves an owned live checkout to a new filesystem path (manifest
   * reconciliation of a moved folder). Throws ConflictException when the
   * (user, path) pair is already registered by a live checkout; returns null when not found.
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
   * @description Re-points an owned live checkout at a different repository row
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
   * of the user's live checkouts of a repository (primary + any worktrees flip
   * together, keeping the repository-level toggle consistent). Returns the number
   * of rows updated (0 when the user owns no live checkout of the repository).
   */
  async setForeignSkillInjectionEnabledForRepository(
    userId: string,
    repositoryId: string,
    enabled: boolean,
  ): Promise<number> {
    const { updateCount } = await this.updateMany(
      { repositoryId, userId },
      { foreignSkillInjectionEnabled: enabled },
    );
    return updateCount;
  }

  /**
   * @description Sets the per-user ot-worktree skill overlay flag (default on,
   * opt-out) for every one of the user's live checkouts of a repository, mirroring
   * {@link RepositoryCheckoutsRepository.setForeignSkillInjectionEnabledForRepository}.
   * Store-only: this is the seam a later task hooks overlay apply/remove behaviour onto.
   * Returns the number of rows updated.
   */
  async setWorktreeSkillOverlayEnabledForRepository(
    userId: string,
    repositoryId: string,
    enabled: boolean,
  ): Promise<number> {
    const { updateCount } = await this.updateMany(
      { repositoryId, userId },
      { worktreeSkillOverlayEnabled: enabled },
    );
    return updateCount;
  }

  /**
   * @description Persists an inspection snapshot with its scan timestamp.
   * Returns null when the live checkout does not exist.
   */
  async saveInspection(
    id: string,
    inspection: Record<string, unknown>,
    scannedAt: Date,
  ): Promise<RepositoryCheckout | null> {
    const existing = await this.findCheckoutById(id);
    if (!existing) return null;
    existing.inspection = inspection;
    existing.scannedAt = scannedAt;
    return this.repository.save(existing);
  }

  /**
   * @description Soft deletes an owned live checkout. Returns false when not found.
   */
  async removeForUser(userId: string, id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ id, userId });
    return removedCount > 0;
  }

  /**
   * @description Soft deletes an owned checkout only when it is a live worktree row. The kind is
   * part of the WHERE clause rather than a prior read, so a primary checkout can never be removed
   * through this path, whatever the caller checked first. A soft delete fires no ON DELETE SET
   * NULL: referencing plan_runs, scheduled-job and worktree_removals rows keep their checkout id,
   * and the checkout then reads as not found. Returns false when no worktree row matched.
   * @public
   */
  async deleteWorktreeCheckout(userId: string, id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({
      id,
      kind: 'worktree',
      userId,
    });
    return removedCount > 0;
  }
}
