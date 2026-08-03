/**
 * @description Domain service for rollout feature flags: CRUD plus RBAC-aware
 * typed evaluation with percentage fallthrough. Evaluation:
 * - disabled → off_variation (`reason: off`)
 * - role gate miss → off_variation (`reason: target_roles`)
 * - else → fallthrough bucket from principal id → mod 100 (`reason: fallthrough`)
 *
 * Bucketing is non-sticky (stand-in for sticky hashing; replaced later).
 * `isEnabled` returns the resolved boolean variation for boolean flags.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { Repository } from 'typeorm';
import {
  pickFallthroughVariation,
  principalIdToBucket,
} from './rollout-flag.bucketing';
import {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
  type RolloutEvaluation,
  type RolloutFallthrough,
  type RolloutFlagKind,
  type RolloutFlagVariation,
  type RolloutVariationValue,
} from './rollout-flag.constants';
import { RolloutFlag } from './rollout-flag.entity';

const ROLLOUT_FLAG_KINDS = new Set<string>(Object.values(ROLLOUT_FLAG_KIND));
const MIN_VARIATIONS = 2;

/** Fields accepted when creating a flag. */
export interface CreateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  fallthrough?: RolloutFallthrough;
  key: string;
  kind?: RolloutFlagKind;
  offVariation?: number;
  targetRoles?: string[];
  variations?: RolloutFlagVariation[];
}

/** Fields accepted when updating a flag (all optional / partial patch). */
export interface UpdateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  fallthrough?: RolloutFallthrough;
  key?: string;
  kind?: RolloutFlagKind;
  offVariation?: number;
  targetRoles?: string[];
  variations?: RolloutFlagVariation[];
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
   * @description Creates a flag. Throws ConflictException if the key is taken;
   * BadRequestException when typed config is invalid.
   */
  async create(input: CreateRolloutFlagInput): Promise<RolloutFlag> {
    await this.assertKeyAvailable(input.key);
    const kind = input.kind ?? ROLLOUT_FLAG_KIND.BOOLEAN;
    const variations =
      input.variations ??
      (kind === ROLLOUT_FLAG_KIND.BOOLEAN
        ? ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS
        : undefined);
    const fallthrough =
      input.fallthrough ??
      (kind === ROLLOUT_FLAG_KIND.BOOLEAN
        ? ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH
        : undefined);
    const offVariation = input.offVariation ?? 0;
    const validated = this.assertValidFlagConfig({
      fallthrough,
      kind,
      offVariation,
      variations,
    });
    const entity = this.rolloutFlagRepository.create({
      description: input.description ?? null,
      enabled: input.enabled ?? false,
      fallthrough: validated.fallthrough,
      key: input.key,
      kind: validated.kind,
      offVariation: validated.offVariation,
      targetRoles: input.targetRoles ?? [],
      variations: validated.variations,
    });
    return this.rolloutFlagRepository.save(entity);
  }

  /**
   * @description Applies a partial patch to a flag. Returns the saved entity, or
   * null if the flag does not exist. Throws ConflictException if the key changes
   * to one already in use; BadRequestException when the merged config is invalid.
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
    const kind = patch.kind ?? existing.kind;
    const variations = patch.variations ?? existing.variations;
    const fallthrough = patch.fallthrough ?? existing.fallthrough;
    const offVariation = patch.offVariation ?? existing.offVariation;
    this.assertValidFlagConfig({
      fallthrough,
      kind,
      offVariation,
      variations,
    });
    this.rolloutFlagRepository.merge(existing, {
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.fallthrough !== undefined
        ? { fallthrough: patch.fallthrough }
        : {}),
      ...(patch.key !== undefined ? { key: patch.key } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.offVariation !== undefined
        ? { offVariation: patch.offVariation }
        : {}),
      ...(patch.targetRoles !== undefined
        ? { targetRoles: patch.targetRoles }
        : {}),
      ...(patch.variations !== undefined
        ? { variations: patch.variations }
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
   * @description Typed evaluation for one flag key. Missing flags return
   * `reason: flag_not_found` with a boolean false stand-in value.
   */
  async evaluate(
    key: string,
    principal: AuthPrincipal,
  ): Promise<RolloutEvaluation> {
    const flag = await this.findByKey(key);
    if (!flag) {
      return {
        key,
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.FLAG_NOT_FOUND,
        value: false,
        variationIndex: -1,
      };
    }
    const roleNames =
      flag.enabled && flag.targetRoles.length > 0
        ? new Set(await this.resolveActorRoleNames(principal))
        : new Set<string>();
    return this.evaluateFlag(flag, roleNames, principal.sub);
  }

  /**
   * @description For boolean flags, returns the resolved variation boolean.
   * Missing / non-boolean flags return false.
   */
  async isEnabled(key: string, principal: AuthPrincipal): Promise<boolean> {
    const evaluation = await this.evaluate(key, principal);
    if (evaluation.kind !== ROLLOUT_FLAG_KIND.BOOLEAN) {
      return false;
    }
    return evaluation.value === true;
  }

  /**
   * @description Evaluates every flag for the actor. Resolves roles at most once,
   * and only when a targeted enabled flag needs them.
   */
  async evaluateAll(principal: AuthPrincipal): Promise<RolloutEvaluation[]> {
    const flags = await this.findAll();
    const needsRoles = flags.some(
      (flag) => flag.enabled && flag.targetRoles.length > 0,
    );
    const roleNames = needsRoles
      ? new Set(await this.resolveActorRoleNames(principal))
      : new Set<string>();
    return flags.map((flag) =>
      this.evaluateFlag(flag, roleNames, principal.sub),
    );
  }

  /**
   * @description Pure evaluation of a loaded flag against roles + principal id.
   */
  private evaluateFlag(
    flag: RolloutFlag,
    roleNames: ReadonlySet<string>,
    principalId: string,
  ): RolloutEvaluation {
    if (!flag.enabled) {
      return this.evaluationFromVariation(
        flag,
        flag.offVariation,
        ROLLOUT_EVALUATION_REASON.OFF,
      );
    }
    if (
      flag.targetRoles.length > 0 &&
      !flag.targetRoles.some((role) => roleNames.has(role))
    ) {
      return this.evaluationFromVariation(
        flag,
        flag.offVariation,
        ROLLOUT_EVALUATION_REASON.TARGET_ROLES,
      );
    }
    const bucket = principalIdToBucket(principalId);
    const variationIndex = pickFallthroughVariation(
      flag.fallthrough.variations,
      bucket,
    );
    return this.evaluationFromVariation(
      flag,
      variationIndex,
      ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
    );
  }

  private evaluationFromVariation(
    flag: RolloutFlag,
    variationIndex: number,
    reason: RolloutEvaluation['reason'],
  ): RolloutEvaluation {
    const safeIndex =
      variationIndex >= 0 && variationIndex < flag.variations.length
        ? variationIndex
        : flag.offVariation >= 0 && flag.offVariation < flag.variations.length
          ? flag.offVariation
          : 0;
    const variation = flag.variations[safeIndex];
    return {
      key: flag.key,
      kind: flag.kind,
      reason,
      value: variation?.value ?? false,
      variationIndex: safeIndex,
    };
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

  /**
   * @description Validates kind, variations, offVariation, and fallthrough
   * weights (integers 0–100 summing to 100). Throws BadRequestException.
   * Returns the narrowed config for callers that need definite assignments.
   */
  private assertValidFlagConfig(config: {
    fallthrough: RolloutFallthrough | undefined;
    kind: RolloutFlagKind;
    offVariation: number;
    variations: RolloutFlagVariation[] | undefined;
  }): {
    fallthrough: RolloutFallthrough;
    kind: RolloutFlagKind;
    offVariation: number;
    variations: RolloutFlagVariation[];
  } {
    if (!ROLLOUT_FLAG_KINDS.has(config.kind)) {
      throw new BadRequestException(
        `Invalid rollout flag kind: ${String(config.kind)}`,
      );
    }
    if (!config.variations || config.variations.length < MIN_VARIATIONS) {
      throw new BadRequestException(
        `Rollout flags require at least ${MIN_VARIATIONS} variations`,
      );
    }
    const variations = config.variations;
    for (const [index, variation] of variations.entries()) {
      if (!this.isValueForKind(config.kind, variation?.value)) {
        throw new BadRequestException(
          `Variation ${index} value does not match kind ${config.kind}`,
        );
      }
    }
    if (
      !Number.isInteger(config.offVariation) ||
      config.offVariation < 0 ||
      config.offVariation >= variations.length
    ) {
      throw new BadRequestException(
        `offVariation must be an integer in [0, ${variations.length - 1}]`,
      );
    }
    if (
      !config.fallthrough ||
      !Array.isArray(config.fallthrough.variations) ||
      config.fallthrough.variations.length === 0
    ) {
      throw new BadRequestException(
        'fallthrough.variations must be a non-empty array',
      );
    }
    const fallthrough = config.fallthrough;
    let weightSum = 0;
    for (const [index, bucket] of fallthrough.variations.entries()) {
      if (
        !Number.isInteger(bucket.variation) ||
        bucket.variation < 0 ||
        bucket.variation >= variations.length
      ) {
        throw new BadRequestException(
          `fallthrough.variations[${index}].variation is out of range`,
        );
      }
      if (
        !Number.isInteger(bucket.weight) ||
        bucket.weight < 0 ||
        bucket.weight > 100
      ) {
        throw new BadRequestException(
          `fallthrough.variations[${index}].weight must be an integer 0–100`,
        );
      }
      weightSum += bucket.weight;
    }
    if (weightSum !== 100) {
      throw new BadRequestException(
        `fallthrough weights must sum to 100 (got ${weightSum})`,
      );
    }
    return {
      fallthrough,
      kind: config.kind,
      offVariation: config.offVariation,
      variations,
    };
  }

  private isValueForKind(
    kind: RolloutFlagKind,
    value: RolloutVariationValue | undefined,
  ): boolean {
    if (value === undefined) {
      return false;
    }
    switch (kind) {
      case ROLLOUT_FLAG_KIND.BOOLEAN:
        return typeof value === 'boolean';
      case ROLLOUT_FLAG_KIND.STRING:
        return typeof value === 'string';
      case ROLLOUT_FLAG_KIND.NUMBER:
        return typeof value === 'number' && Number.isFinite(value);
      case ROLLOUT_FLAG_KIND.JSON:
        return this.isJsonObjectOrArray(value);
      default:
        return false;
    }
  }

  private isJsonObjectOrArray(value: RolloutVariationValue): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    try {
      JSON.parse(JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}
