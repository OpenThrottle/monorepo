import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ListPaginationInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  resolveListPagination,
} from '@openthrottle/nestjs-postgres';
import type { DeepPartial } from 'typeorm';
import { Repository } from 'typeorm';

import { ServiceAccount } from './service-account.entity.ts';
import type { ServiceAccountCreateInput } from './service-accounts.types.ts';

/**
 * @description Data access for the openthrottle `service_accounts` table on the default
 * connection: the `BaseRepository` CRUD plus the name lookup, the newest-first list, the
 * acting-user resolution and the disable switch. A delete is a soft delete. Credentials live
 * in `ServiceAccountCredentialsRepository`.
 * @public
 */
@Injectable()
export class ServiceAccountsRepository extends BaseRepository<
  ServiceAccount,
  ServiceAccountCreateInput
> {
  protected readonly tableName = 'service_accounts';

  constructor(
    @InjectRepository(ServiceAccount)
    repository: Repository<ServiceAccount>,
  ) {
    super(repository);
  }

  /**
   * @description Spells the optional columns out as null so the created account reads back
   * with them, not undefined.
   */
  protected override toEntityInput(
    input: ServiceAccountCreateInput,
  ): DeepPartial<ServiceAccount> {
    return {
      actingUserId: input.actingUserId ?? null,
      description: input.description ?? null,
      disabledAt: input.disabledAt ?? null,
      name: input.name,
    };
  }

  /**
   * @description Returns live service accounts, newest first. Accepts an optional clamped
   * `{ limit, offset }` so the result set stays bounded.
   */
  async findAll(pagination?: ListPaginationInput): Promise<ServiceAccount[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.repository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * @description Finds a live service account by its unique name (e.g. 'workflow-ralph'), or null.
   */
  async findByName(name: string): Promise<ServiceAccount | null> {
    return this.repository.findOne({ where: { name } });
  }

  /**
   * @description The user a service account acts as for user-scoped
   * conveniences, or null when the account is missing, disabled, or unlinked.
   * Never a permission grant — authorization still comes from the account's
   * roles.
   */
  async resolveActingUserId(serviceAccountId: string): Promise<string | null> {
    const account = await this.repository.findOne({
      where: { id: serviceAccountId },
    });
    if (account == null || account.disabledAt != null) {
      return null;
    }
    return account.actingUserId;
  }

  /**
   * @description Disables a service account.
   * @throws NotFoundException when no live account has that id.
   */
  async disable(id: string): Promise<ServiceAccount> {
    return this.update(id, { disabledAt: new Date() });
  }

  /**
   * @description Re-enables a disabled service account.
   * @throws NotFoundException when no live account has that id.
   */
  async enable(id: string): Promise<ServiceAccount> {
    return this.update(id, { disabledAt: null });
  }
}
