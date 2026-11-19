import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import type { ServiceAccountsRepository } from '@openthrottle/nestjs-repositories-server';

import type { TagCaller } from '../../services/tags/tags.types.ts';
/**
 * @description Builds the {@link TagCaller} from the request principal: user
 * JWTs map directly; service-account principals resolve their account name so
 * the tags service can classify the tagging account as server-llm.
 */
export const resolveTagCaller = async (
  principal: AuthPrincipal,
  serviceAccountsRepository: ServiceAccountsRepository,
): Promise<TagCaller> => {
  if (principal.kind === AUTH_PRINCIPAL_KIND_USER) {
    return { principalKind: 'user', subjectId: principal.sub };
  }

  const account = await serviceAccountsRepository.findOne({
    where: { id: principal.sub },
  });
  return {
    principalKind: 'service_account',
    serviceAccountName: account?.name,
    subjectId: principal.sub,
  };
};
