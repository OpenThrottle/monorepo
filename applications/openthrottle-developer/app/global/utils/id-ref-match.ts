import type { IdRefMatch } from '@openthrottle/react-router-ui';

import type { ResolveIdRefQuery } from '~/__generated__/graphql';
import { IdRefKind } from '~/__generated__/graphql';

type ResolvedIdRef = ResolveIdRefQuery['resolveIdRef'][number];

/**
 * @description Narrow a GraphQL `IdRefObject` into the client's discriminated
 * {@link IdRefMatch}. A TASK ref without a `planId` cannot be linked to, so it
 * is dropped rather than rendered as a dead row.
 */
export const toIdRefMatch = (ref: ResolvedIdRef): IdRefMatch | null => {
  const { id, status, title } = ref;

  if (ref.kind === IdRefKind.Plan) {
    return { id, kind: 'PLAN', status, title };
  }

  if (ref.planId == null) {
    return null;
  }

  return {
    id,
    kind: 'TASK',
    planId: ref.planId,
    planTitle: ref.planTitle ?? null,
    status,
    title,
  };
};

export const isIdRefMatch = (match: IdRefMatch | null): match is IdRefMatch => {
  return match !== null;
};
