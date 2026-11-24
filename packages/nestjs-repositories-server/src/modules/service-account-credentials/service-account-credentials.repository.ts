import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { DeepPartial } from 'typeorm';
import { IsNull, Repository } from 'typeorm';

import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { SERVICE_ACCOUNT_SECRET_MIN_LENGTH } from './secret/secret.constants.ts';
import {
  hashSecret,
  isLegacySecretHash,
  validateSecret,
} from './secret/secret.utils.ts';
import { ServiceAccountCredential } from './service-account-credential.entity.ts';
import type {
  CreateServiceAccountCredentialResult,
  ServiceAccountCredentialCreateInput,
  UpsertServiceAccountCredentialResult,
  VerifiedServiceAccountCredential,
} from './service-account-credentials.types.ts';
import {
  formatServiceAccountToken,
  normalizeServiceAccountBearerToken,
  parseServiceAccountToken,
} from './token/token.utils.ts';

const PREFIX_LENGTH = 12;
const SECRET_LENGTH = SERVICE_ACCOUNT_SECRET_MIN_LENGTH;
const ALPHABET = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;

/**
 * @description Data access and lifecycle for the openthrottle `service_account_credentials`
 * table on the default connection: the `BaseRepository` CRUD plus credential generation,
 * bearer-token verification, revocation and listing. The table is hard delete; a credential
 * is revoked through `revoked_at`. A credential whose service account is disabled or soft
 * deleted never verifies.
 * @public
 */
@Injectable()
export class ServiceAccountCredentialsRepository extends BaseRepository<
  ServiceAccountCredential,
  ServiceAccountCredentialCreateInput
> {
  protected readonly tableName = 'service_account_credentials';

  constructor(
    @InjectRepository(ServiceAccountCredential)
    repository: Repository<ServiceAccountCredential>,
    @InjectRepository(ServiceAccount)
    private readonly serviceAccountRepository: Repository<ServiceAccount>,
  ) {
    super(repository);
  }

  /**
   * @description Spells the optional columns out as null so the created credential reads back
   * with them, not undefined.
   */
  protected override toEntityInput(
    input: ServiceAccountCredentialCreateInput,
  ): DeepPartial<ServiceAccountCredential> {
    return {
      expiresAt: input.expiresAt ?? null,
      label: input.label ?? null,
      lastUsedAt: input.lastUsedAt ?? null,
      prefix: input.prefix,
      revokedAt: input.revokedAt ?? null,
      secretHash: input.secretHash,
      serviceAccountId: input.serviceAccountId,
    };
  }

  /**
   * @description Creates a credential and returns the plaintext `ot_sa_<prefix>_<secret>`
   * once. Null when the service account is missing, soft deleted or disabled.
   */
  async createCredential(input: {
    expiresAt?: Date | null;
    label?: string | null;
    serviceAccountId: string;
  }): Promise<CreateServiceAccountCredentialResult | null> {
    const account = await this.serviceAccountRepository.findOne({
      where: { id: input.serviceAccountId },
    });
    if (!account || account.disabledAt != null) {
      return null;
    }

    const prefix = await this.generateUniquePrefix();
    const secret = this.randomAlphanumeric(SECRET_LENGTH);
    const secretHash = hashSecret(secret);

    const credential = await this.create({
      expiresAt: input.expiresAt ?? null,
      label: input.label ?? null,
      prefix,
      secretHash,
      serviceAccountId: input.serviceAccountId,
    });

    return {
      credential,
      token: formatServiceAccountToken(prefix, secret),
    };
  }

  /**
   * @description Deterministically provisions the credential for a KNOWN
   * `ot_sa_<prefix>_<secret>` token (e.g. one supplied via `.env` for a fully
   * Dockerized bootstrap) so that bearer verifies end-to-end. Idempotent:
   * `noop` when a non-revoked credential with that prefix already verifies the
   * secret; otherwise the row is rehashed and un-revoked in place (`updated`),
   * or created (`created`). Returns null when the service account is missing,
   * soft deleted or disabled. Throws when `token` is malformed, its prefix
   * belongs to a different service account, or its secret is shorter than
   * `SERVICE_ACCOUNT_SECRET_MIN_LENGTH` and would have to be written (a
   * credential that already verifies stays a `noop`).
   */
  async upsertCredentialForToken(input: {
    label?: string | null;
    serviceAccountId: string;
    token: string;
  }): Promise<UpsertServiceAccountCredentialResult | null> {
    const account = await this.serviceAccountRepository.findOne({
      where: { id: input.serviceAccountId },
    });
    if (!account || account.disabledAt != null) {
      return null;
    }

    const parsed = parseServiceAccountToken(input.token);
    if (parsed == null) {
      throw new Error(
        'Invalid service account token: expected format ot_sa_<prefix>_<secret>.',
      );
    }

    const existing = await this.repository.findOne({
      where: { prefix: parsed.prefix },
    });

    if (existing != null) {
      if (existing.serviceAccountId !== input.serviceAccountId) {
        throw new Error(
          `Service account token prefix "${parsed.prefix}" is already in use by a different service account.`,
        );
      }
      const alreadyMatches =
        existing.revokedAt == null &&
        (await validateSecret(parsed.secret, existing.secretHash));
      if (alreadyMatches) {
        return { action: 'noop', credential: existing };
      }
      assertSecretLongEnough(parsed.secret);
      existing.secretHash = hashSecret(parsed.secret);
      existing.revokedAt = null;
      if (input.label !== undefined) {
        existing.label = input.label;
      }
      const updated = await this.repository.save(existing);
      return { action: 'updated', credential: updated };
    }

    assertSecretLongEnough(parsed.secret);
    const secretHash = hashSecret(parsed.secret);
    const created = await this.create({
      expiresAt: null,
      label: input.label ?? null,
      prefix: parsed.prefix,
      secretHash,
      serviceAccountId: input.serviceAccountId,
    });
    return { action: 'created', credential: created };
  }

  /**
   * @description Validates `Bearer ot_sa_<prefix>_<secret>` (or raw token) and updates
   * `last_used_at` on success. Null for a malformed or unknown token, a wrong secret, a
   * revoked or expired credential, and a credential whose service account is disabled or soft
   * deleted (the account relation reads live rows only, so a deleted account loads as null).
   * A legacy bcrypt hash that verifies is rewritten to SHA-256 in place, so each credential pays
   * bcrypt once after the scheme change; an unknown prefix hashes nothing (the prefix is public).
   */
  async verifyBearerToken(
    authorizationOrToken: string,
  ): Promise<VerifiedServiceAccountCredential | null> {
    const match = await this.findActiveCredential(authorizationOrToken);
    if (match == null) {
      return null;
    }
    const { credential, secret } = match;

    if (
      isLegacySecretHash(credential.secretHash) &&
      secret.length >= SERVICE_ACCOUNT_SECRET_MIN_LENGTH
    ) {
      await this.updateMany(
        { id: credential.id },
        { lastUsedAt: new Date(), secretHash: hashSecret(secret) },
      );
    } else {
      await this.touchLastUsedAt(credential.id);
    }

    return {
      credentialId: credential.id,
      serviceAccountId: credential.serviceAccountId,
    };
  }

  /**
   * @description True when `token` would authenticate right now (same checks as
   * {@link verifyBearerToken}), without touching `last_used_at` or rehashing — for
   * health probes that must not look like usage.
   */
  async isActiveToken(authorizationOrToken: string): Promise<boolean> {
    return (await this.findActiveCredential(authorizationOrToken)) != null;
  }

  /** The live credential `token` names, with its parsed secret, or null. Read-only. */
  private async findActiveCredential(authorizationOrToken: string): Promise<{
    readonly credential: ServiceAccountCredential;
    readonly secret: string;
  } | null> {
    const token = normalizeServiceAccountBearerToken(authorizationOrToken);
    if (token == null) {
      return null;
    }

    const parsed = parseServiceAccountToken(token);
    if (parsed == null) {
      return null;
    }

    const credential = await this.repository.findOne({
      relations: {
        serviceAccount: true,
      },
      where: { prefix: parsed.prefix },
    });

    if (credential == null) {
      return null;
    }

    const secretMatches = await validateSecret(
      parsed.secret,
      credential.secretHash,
    );

    if (
      !secretMatches ||
      credential.revokedAt != null ||
      this.isExpired(credential.expiresAt) ||
      credential.serviceAccount == null ||
      credential.serviceAccount.disabledAt != null
    ) {
      return null;
    }

    return { credential, secret: parsed.secret };
  }

  /**
   * @description Sets `revoked_at` on a credential. Returns true when a row was updated.
   */
  async revokeCredential(credentialId: string): Promise<boolean> {
    const existing = await this.repository.findOne({
      where: { id: credentialId },
    });
    if (!existing || existing.revokedAt != null) {
      return false;
    }
    existing.revokedAt = new Date();
    await this.repository.save(existing);
    return true;
  }

  /**
   * @description Updates `last_used_at` for a credential (also invoked from {@link verifyBearerToken}).
   */
  async touchLastUsedAt(credentialId: string): Promise<boolean> {
    const result = await this.updateMany(
      { id: credentialId },
      { lastUsedAt: new Date() },
    );
    return result.updateCount > 0;
  }

  /**
   * @description Active (non-revoked) credentials for a service account, newest first.
   */
  async findActiveCredentials(
    serviceAccountId: string,
  ): Promise<ServiceAccountCredential[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      where: {
        revokedAt: IsNull(),
        serviceAccountId,
      },
    });
  }

  /**
   * @description All credentials for a service account (including revoked), newest first, for admin listing.
   */
  async findCredentials(
    serviceAccountId: string,
  ): Promise<ServiceAccountCredential[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      where: { serviceAccountId },
    });
  }

  /**
   * @description Finds a credential by id, or null if not found.
   */
  async findCredentialById(
    id: string,
  ): Promise<ServiceAccountCredential | null> {
    return this.repository.findOne({ where: { id } });
  }

  private isExpired(expiresAt: Date | null): boolean {
    if (expiresAt == null) {
      return false;
    }
    return expiresAt.getTime() <= Date.now();
  }

  /**
   * @description Picks a credential prefix not currently in use. Best-effort:
   * generates several candidates and filters by an existing-prefix lookup.
   * Note (awareness): a TOCTOU window exists between this check and the insert
   * in {@link createCredential}; the prefix column's DB uniqueness is the real
   * guarantee. With 12-char alphanumeric prefixes a collision is astronomically
   * unlikely, so this is acceptable as-is.
   */
  private async generateUniquePrefix(): Promise<string> {
    const candidates = Array.from({ length: 8 }, () => {
      return this.randomAlphanumeric(PREFIX_LENGTH);
    });
    const existing = await this.repository.find({
      where: candidates.map((prefix) => ({ prefix })),
    });
    const taken = new Set(existing.map((row) => row.prefix));
    const available = candidates.find((prefix) => !taken.has(prefix));
    if (available == null) {
      throw new Error(
        'Failed to generate unique service account credential prefix',
      );
    }
    return available;
  }

  private randomAlphanumeric(length: number): string {
    return Array.from(randomBytes(length), (byte) => {
      return ALPHABET.charAt(byte % ALPHABET.length);
    }).join('');
  }
}

/**
 * @description Refuses to store a secret too short for a fast hash to be safe. Throwing is the
 * desired behavior: it only runs on the one-shot provisioning path, which must fail loudly.
 */
function assertSecretLongEnough(secret: string): void {
  if (secret.length < SERVICE_ACCOUNT_SECRET_MIN_LENGTH) {
    throw new Error(
      `Service account token secret is ${secret.length} characters; at least ${SERVICE_ACCOUNT_SECRET_MIN_LENGTH} are required. Mint one with \`pnpm run database:bootstrap-service-accounts\` (leave the env var unset) instead of choosing it by hand.`,
    );
  }
}
