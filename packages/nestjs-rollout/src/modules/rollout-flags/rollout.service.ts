/**
 * @description Domain service for rollout feature flags: CRUD plus role-targeted
 * evaluation. Evaluation is locked: a flag is ON for an actor when `enabled === true`
 * AND (`targetRoles` empty ⇒ everyone, else the actor holds ≥1 of `targetRoles`).
 * Actor roles resolve via RolesService, branching on principal.kind exactly like
 * the app's GqlPermissionsGuard.
 */

import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { Repository } from 'typeorm';
import { RolloutFlag } from './rollout-flag.entity';

/** Fields accepted when creating a flag. */
export interface CreateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  key: string;
  targetRoles?: string[];
}

/** Fields accepted when updating a flag (all optional / partial patch). */
export interface UpdateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  key?: string;
  targetRoles?: string[];
}

/** A flag key paired with its evaluated on/off state for a given actor. */
export interface EvaluatedFlag {
  enabled: boolean;
  key: string;
}

@Injectable()
export class RolloutService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(RolloutFlag)
    private readonly rolloutFlagRepository: Repository<RolloutFlag>,
    private readonly rolesService: RolesService,
  ) {
    this.logger.debug('🚩 rollout 🚩');
  }

  /**
   * @description Returns all flags, ordered by key.
   */
  async findAll(): Promise<RolloutFlag[]> {
    return this.rolloutFlagRepository.find({ order: { key: 'ASC' } });
  }

  /**
   * @description Finds a flag by id, or null if not found.
   */
  async findById(id: string): Promise<RolloutFlag | null> {
    return this.rolloutFlagRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a flag by key, or null if not found.
   */
  async findByKey(key: string): Promise<RolloutFlag | null> {
    return this.rolloutFlagRepository.findOne({ where: { key } });
  }

  /**
   * @description Creates a flag. Throws ConflictException if the key is taken.
   */
  async create(input: CreateRolloutFlagInput): Promise<RolloutFlag> {
    await this.assertKeyAvailable(input.key);
    const entity = this.rolloutFlagRepository.create({
      description: input.description ?? null,
      enabled: input.enabled ?? false,
      key: input.key,
      targetRoles: input.targetRoles ?? [],
    });
    return this.rolloutFlagRepository.save(entity);
  }

  /**
   * @description Applies a partial patch to a flag. Returns the saved entity, or
   * null if the flag does not exist. Throws ConflictException if the key changes
   * to one already in use.
   */
  async update(
    id: string,
    patch: UpdateRolloutFlagInput,
  ): Promise<RolloutFlag | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    if (patch.key !== undefined && patch.key !== existing.key) {
      await this.assertKeyAvailable(patch.key);
    }
    this.rolloutFlagRepository.merge(existing, {
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.key !== undefined ? { key: patch.key } : {}),
      ...(patch.targetRoles !== undefined
        ? { targetRoles: patch.targetRoles }
        : {}),
    });
    return this.rolloutFlagRepository.save(existing);
  }

  /**
   * @description Deletes a flag by id. Returns true if a row was deleted.
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.rolloutFlagRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Evaluates a single flag for the actor. False when the flag is
   * missing or disabled; true when enabled with no role targeting; otherwise true
   * only when the actor holds at least one targeted role.
   */
  async isEnabled(key: string, principal: AuthPrincipal): Promise<boolean> {
    const flag = await this.findByKey(key);
    if (!flag || !flag.enabled) return false;
    if (flag.targetRoles.length === 0) return true;
    const roleNames = new Set(await this.resolveActorRoleNames(principal));
    return flag.targetRoles.some((role) => roleNames.has(role));
  }

  /**
   * @description Evaluates every flag for the actor (backs the myFeatureFlags query).
   * Resolves the actor's roles at most once, and only when a targeted enabled flag needs them.
   */
  async evaluateAll(principal: AuthPrincipal): Promise<EvaluatedFlag[]> {
    const flags = await this.findAll();
    const needsRoles = flags.some(
      (flag) => flag.enabled && flag.targetRoles.length > 0,
    );
    const roleNames = needsRoles
      ? new Set(await this.resolveActorRoleNames(principal))
      : new Set<string>();
    return flags.map((flag) => ({
      enabled: this.evaluateFlag(flag, roleNames),
      key: flag.key,
    }));
  }

  /**
   * @description Pure evaluation of a loaded flag against a set of role names.
   */
  private evaluateFlag(
    flag: RolloutFlag,
    roleNames: ReadonlySet<string>,
  ): boolean {
    if (!flag.enabled) return false;
    if (flag.targetRoles.length === 0) return true;
    return flag.targetRoles.some((role) => roleNames.has(role));
  }

  /**
   * @description Resolves the actor's role names, branching on principal kind
   * exactly like GqlPermissionsGuard (user vs service account).
   */
  private async resolveActorRoleNames(
    principal: AuthPrincipal,
  ): Promise<string[]> {
    return principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
      ? this.rolesService.findRoleNamesByServiceAccountId(principal.sub)
      : this.rolesService.findRoleNamesByUserId(principal.sub);
  }

  /**
   * @description Throws ConflictException when a flag with the given key exists.
   */
  private async assertKeyAvailable(key: string): Promise<void> {
    const existing = await this.findByKey(key);
    if (existing) {
      throw new ConflictException(`Rollout flag key already exists: ${key}`);
    }
  }
}
