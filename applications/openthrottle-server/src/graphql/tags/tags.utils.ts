import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import type { ServiceAccountsService } from '@openthrottle/nestjs-repositories';
import { type TagCaller } from '@openthrottle/nestjs-repositories';
/**
 * @description Builds the {@link TagCaller} from the request principal: user
 * JWTs map directly; service-account principals resolve their account name so
 * the tags service can classify the tagging account as server-llm.
 */
export const resolveTagCaller = async (
  principal: AuthPrincipal,
  serviceAccountsService: ServiceAccountsService,
): Promise<TagCaller> => {
  if (principal.kind === AUTH_PRINCIPAL_KIND_USER) {
    return { principalKind: 'user', subjectId: principal.sub };
  }

  const account = await serviceAccountsService.findById(principal.sub);
  return {
    principalKind: 'service_account',
    serviceAccountName: account?.name,
    subjectId: principal.sub,
  };
};
