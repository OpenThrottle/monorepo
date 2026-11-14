/**
 * @description Registers the GraphQL enum `IdRefKind`, the discriminator on
 * {@link IdRefObject} that says whether a resolved id is a plan or a task.
 */

import { registerEnumType } from '@nestjs/graphql';

export const ID_REF_KIND = {
  PLAN: 'PLAN',
  TASK: 'TASK',
} as const;

export type IdRefKind = (typeof ID_REF_KIND)[keyof typeof ID_REF_KIND];

registerEnumType(ID_REF_KIND, {
  description: `Which entity an id ref resolved to: a plan or a task.`,
  name: 'IdRefKind',
});
