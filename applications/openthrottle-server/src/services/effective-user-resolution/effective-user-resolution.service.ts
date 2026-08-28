import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';

/**
 * @description Maps an auth principal's `sub` to the human user it acts as.
 *
 * A `sub` is either a `users.id` (human JWT) or a `service_accounts.id`
 * (machine bearer token) — see AuthPrincipal in `@openthrottle/nestjs-auth`.
 * User-scoped conveniences (e.g. resolving a plan's creating workspace against
 * the caller's registered checkouts) need a human user to scope by, so a
 * service-account sub resolves through its `acting_user_id` link.
 *
 * Resolution is a hint, never a gate or a permission grant: an unknown sub, an
 * unlinked or disabled service account, or a lookup failure all resolve to
 * null, and authorization still comes from roles.
 */
@Injectable()
export class EffectiveUserResolutionService {
  private readonly name = 'effective-user-resolution';

  constructor(
    private readonly logger: LoggerService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly usersService: UsersService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description The user id the sub acts as: a user sub passes through
   * unchanged; a service-account sub resolves to its acting user (null when
   * unlinked or disabled); anything else — including lookup errors — is null.
   */
  async resolveEffectiveUserId(
    sub: string | null | undefined,
  ): Promise<string | null> {
    const trimmed = sub?.trim() ?? '';
    if (trimmed === '') {
      return null;
    }

    try {
      const user = await this.usersService.findById(trimmed);
      if (user != null) {
        return user.id;
      }

      return await this.serviceAccountsService.resolveActingUserId(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name}: could not resolve effective user for sub: ${message}`,
      );
      return null;
    }
  }
}
