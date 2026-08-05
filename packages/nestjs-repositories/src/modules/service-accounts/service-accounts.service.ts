/**
 * @description Service account CRUD and credential lifecycle (generate, verify, revoke).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import {
  type ListPaginationInput,
  resolveListPagination,
} from '../../common/list-pagination';
import { ServiceAccountCredential } from './service-account-credential.entity';
import { ServiceAccount } from './service-account.entity';
import {
  formatServiceAccountToken,
  normalizeServiceAccountBearerToken,
  parseServiceAccountToken,
} from './service-account-token.util';

/** Result of a successful {@link ServiceAccountsService.verifyBearerToken}. */
export type VerifiedServiceAccountCredential = {
  readonly credentialId: string;
  readonly serviceAccountId: string;
};

/** Plaintext token plus saved credential row (secret shown once). */
export type CreateServiceAccountCredentialResult = {
  readonly credential: ServiceAccountCredential;
  readonly token: string;
};

/**
 * Outcome of {@link ServiceAccountsService.upsertCredentialForToken}. `action`
 * distinguishes an idempotent no-op (the token already verifies) from a write
 * (a new credential row, or an in-place rehash/un-revoke of an existing one).
 */
export type UpsertServiceAccountCredentialResult = {
  readonly action: 'created' | 'noop' | 'updated';
  readonly credential: ServiceAccountCredential;
};

@Injectable()
export class ServiceAccountsService {
  private static readonly DEFAULT_BCRYPT_ROUNDS = 10;
  private static readonly PREFIX_LENGTH = 12;
  private static readonly SECRET_LENGTH = 32;

  private dummyBcryptHash: string | null = null;

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(ServiceAccount)
    private readonly serviceAccountRepository: Repository<ServiceAccount>,
    @InjectRepository(ServiceAccountCredential)
    private readonly credentialRepository: Repository<ServiceAccountCredential>,
  ) {
    this.logger.debug('🔐 service-accounts 🔐');
  }

  getServiceAccountRepository(): Repository<ServiceAccount> {
    return this.serviceAccountRepository;
  }

  getCredentialRepository(): Repository<ServiceAccountCredential> {
    return this.credentialRepository;
  }

  /**
   * @description Returns service accounts, newest first. Accepts an optional
   * clamped `{ limit, offset }` so the result set stays bounded.
   */
  async findAll(pagination?: ListPaginationInput): Promise<ServiceAccount[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.serviceAccountRepository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * @description Finds a service account by id, or null if not found.
   */
  async findById(id: string): Promise<ServiceAccount | null> {
    return this.serviceAccountRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a service account by its unique name (e.g. 'workflow-ralph'), or null.
   */
  async findByName(name: string): Promise<ServiceAccount | null> {
    return this.serviceAccountRepository.findOne({ where: { name } });
  }

  /**
   * @description Creates a service account.
   */
  async create(data: {
    description?: string | null;
    name: string;
  }): Promise<ServiceAccount> {
    const entity = this.serviceAccountRepository.create({
      description: data.description ?? null,
      name: data.name,
    });
    return this.serviceAccountRepository.save(entity);
  }

  /**
   * @description Updates a service account by id. Returns null when not found.
   */
  async update(
    id: string,
    data: {
      description?: string | null;
      name?: string;
    },
  ): Promise<ServiceAccount | null> {
    const existing = await this.serviceAccountRepository.findOne({
      where: { id },
    });
    if (!existing) {
      return null;
    }
    this.serviceAccountRepository.merge(existing, {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.name != null && { name: data.name }),
    });
    return this.serviceAccountRepository.save(existing);
  }

  /**
   * @description Disables a service account. Returns null when not found.
   */
  async disable(id: string): Promise<ServiceAccount | null> {
    const existing = await this.serviceAccountRepository.findOne({
      where: { id },
    });
    if (!existing) {
      return null;
    }
    existing.disabledAt = new Date();
    return this.serviceAccountRepository.save(existing);
  }

  /**
   * @description Re-enables a disabled service account. Returns null when not found.
   */
  async enable(id: string): Promise<ServiceAccount | null> {
    const existing = await this.serviceAccountRepository.findOne({
      where: { id },
    });
    if (!existing) {
      return null;
    }
    existing.disabledAt = null;
    return this.serviceAccountRepository.save(existing);
  }

  /**
   * @description Creates a credential and returns the plaintext `ot_sa_<prefix>_<secret>` once.
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
    const secret = this.generateSecret();
    const secretHash = await this.hashSecret(secret);

    const credential = await this.credentialRepository.save(
      this.credentialRepository.create({
        expiresAt: input.expiresAt ?? null,
        label: input.label ?? null,
        prefix,
        secretHash,
        serviceAccountId: input.serviceAccountId,
      }),
    );

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
   * or created (`created`). Returns null when the service account is missing or
   * disabled. Throws when `token` is malformed or its prefix belongs to a
   * different service account.
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

    const existing = await this.credentialRepository.findOne({
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
        (await bcrypt.compare(parsed.secret, existing.secretHash));
      if (alreadyMatches) {
        return { action: 'noop', credential: existing };
      }
      existing.secretHash = await this.hashSecret(parsed.secret);
      existing.revokedAt = null;
      if (input.label !== undefined) {
        existing.label = input.label;
      }
      const updated = await this.credentialRepository.save(existing);
      return { action: 'updated', credential: updated };
    }

    const secretHash = await this.hashSecret(parsed.secret);
    const created = await this.credentialRepository.save(
      this.credentialRepository.create({
        expiresAt: null,
        label: input.label ?? null,
        prefix: parsed.prefix,
        secretHash,
        serviceAccountId: input.serviceAccountId,
      }),
    );
    return { action: 'created', credential: created };
  }

  /**
   * @description Validates `Bearer ot_sa_<prefix>_<secret>` (or raw token) and updates `last_used_at` on success.
   */
  async verifyBearerToken(
    authorizationOrToken: string,
  ): Promise<VerifiedServiceAccountCredential | null> {
    const token = normalizeServiceAccountBearerToken(authorizationOrToken);
    if (token == null) {
      return null;
    }

    const parsed = parseServiceAccountToken(token);
    if (parsed == null) {
      return null;
    }

    const credential = await this.credentialRepository.findOne({
      relations: ['serviceAccount'],
      where: { prefix: parsed.prefix },
    });

    const hashToCompare =
      credential?.secretHash ?? (await this.getDummyBcryptHash());
    const secretMatches = await bcrypt.compare(parsed.secret, hashToCompare);

    if (
      credential == null ||
      !secretMatches ||
      credential.revokedAt != null ||
      this.isExpired(credential.expiresAt) ||
      credential.serviceAccount?.disabledAt != null
    ) {
      return null;
    }

    await this.touchLastUsedAt(credential.id);

    return {
      credentialId: credential.id,
      serviceAccountId: credential.serviceAccountId,
    };
  }

  /**
   * @description Sets `revoked_at` on a credential. Returns true when a row was updated.
   */
  async revokeCredential(credentialId: string): Promise<boolean> {
    const existing = await this.credentialRepository.findOne({
      where: { id: credentialId },
    });
    if (!existing || existing.revokedAt != null) {
      return false;
    }
    existing.revokedAt = new Date();
    await this.credentialRepository.save(existing);
    return true;
  }

  /**
   * @description Updates `last_used_at` for a credential (also invoked from {@link verifyBearerToken}).
   */
  async touchLastUsedAt(credentialId: string): Promise<boolean> {
    const result = await this.credentialRepository.update(
      { id: credentialId },
      { lastUsedAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Hashes a credential secret with bcrypt.
   */
  async hashSecret(
    plainSecret: string,
    rounds: number = ServiceAccountsService.DEFAULT_BCRYPT_ROUNDS,
  ): Promise<string> {
    return bcrypt.hash(plainSecret, rounds);
  }

  /**
   * @description Compares plaintext secret to stored bcrypt hash.
   */
  async validateSecret(
    plainSecret: string,
    secretHash: string | null | undefined,
  ): Promise<boolean> {
    if (secretHash == null || secretHash === '') {
      return false;
    }
    return bcrypt.compare(plainSecret, secretHash);
  }

  private isExpired(expiresAt: Date | null): boolean {
    if (expiresAt == null) {
      return false;
    }
    return expiresAt.getTime() <= Date.now();
  }

  private generateSecret(): string {
    return this.randomAlphanumeric(ServiceAccountsService.SECRET_LENGTH);
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
    const candidates = Array.from({ length: 8 }, () =>
      this.randomAlphanumeric(ServiceAccountsService.PREFIX_LENGTH),
    );
    const existing = await this.credentialRepository.find({
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
    const alphabet =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += alphabet[bytes[i]! % alphabet.length]!;
    }
    return result;
  }

  /** Bcrypt compare target when prefix is unknown (mitigates timing leaks). */
  private async getDummyBcryptHash(): Promise<string> {
    if (this.dummyBcryptHash == null) {
      this.dummyBcryptHash = await bcrypt.hash(
        '__invalid_service_account_credential__',
        ServiceAccountsService.DEFAULT_BCRYPT_ROUNDS,
      );
    }
    return this.dummyBcryptHash;
  }

  /**
   * @description Active (non-revoked) credentials for a service account.
   */
  async findActiveCredentials(
    serviceAccountId: string,
  ): Promise<ServiceAccountCredential[]> {
    return this.credentialRepository.find({
      order: { createdAt: 'DESC' },
      where: {
        revokedAt: IsNull(),
        serviceAccountId,
      },
    });
  }

  /**
   * @description All credentials for a service account (including revoked), for admin listing.
   */
  async findCredentials(
    serviceAccountId: string,
  ): Promise<ServiceAccountCredential[]> {
    return this.credentialRepository.find({
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
    return this.credentialRepository.findOne({ where: { id } });
  }
}
