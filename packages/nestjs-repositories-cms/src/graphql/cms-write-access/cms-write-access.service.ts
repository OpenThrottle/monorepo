import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getAuthPrincipalFromRequest } from '@openthrottle/nestjs-auth';

import { CMS_WRITE_AUTHORIZER } from './cms-write-access.constants.ts';
import type {
  CmsWriteAccess,
  CmsWriteAuthorizer,
} from './cms-write-access.types.ts';

/**
 * @description Answers "may the caller behind this request write cms content?" without
 * throwing. `CmsWriteGuard` turns a refusal into an error for mutations; reads use the same
 * answer to decide whether the caller may see unpublished (DRAFT, DISABLED) layouts. Asks the
 * host's `CMS_WRITE_AUTHORIZER`; with none registered every caller is refused (fail closed).
 * @public
 */
@Injectable()
export class CmsWriteAccessService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async authorize(request: unknown): Promise<CmsWriteAccess> {
    const principal = getAuthPrincipalFromRequest(request);

    if (!principal) {
      return {
        code: 'UNAUTHENTICATED',
        ok: false,
        reason: `Sign in to change cms content`,
      };
    }

    const authorizer = this.findAuthorizer();

    if (!authorizer) {
      return {
        code: 'FORBIDDEN',
        ok: false,
        reason: `cms writes are disabled: the host registers no ${CMS_WRITE_AUTHORIZER}`,
      };
    }

    const decision = await authorizer.authorize(principal);

    if (!decision.ok) {
      return { code: 'FORBIDDEN', ok: false, reason: decision.reason };
    }

    return { ok: true, writer: decision.writer };
  }

  /**
   * @description Whether the caller may write cms content, for reads that show more to editors.
   */
  async canWrite(request: unknown): Promise<boolean> {
    const access = await this.authorize(request);

    return access.ok;
  }

  private findAuthorizer(): CmsWriteAuthorizer | null {
    try {
      const candidate: unknown = this.moduleRef.get(CMS_WRITE_AUTHORIZER, {
        strict: false,
      });

      return isCmsWriteAuthorizer(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }
}

/**
 * @description Narrows a resolved provider to {@link CmsWriteAuthorizer}.
 */
function isCmsWriteAuthorizer(value: unknown): value is CmsWriteAuthorizer {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'authorize') === 'function'
  );
}
