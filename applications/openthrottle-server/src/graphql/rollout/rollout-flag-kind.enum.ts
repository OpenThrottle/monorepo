/**
 * @description Registers the `RolloutFlagKind` GraphQL enum from
 * `@openthrottle/nestjs-rollout` so SDL and domain kinds stay in lockstep.
 */

import { registerEnumType } from '@nestjs/graphql';
import { ROLLOUT_FLAG_KIND } from '@openthrottle/nestjs-rollout';
import type { RolloutFlagKind } from '@openthrottle/nestjs-rollout';

/**
 * Runtime enum object for code-first registration. Lowercase GraphQL names match
 * domain values (`boolean` | `string` | `number` | `json`).
 */
export const RolloutFlagKindEnum: Readonly<Record<string, RolloutFlagKind>> =
  Object.fromEntries(
    Object.values(ROLLOUT_FLAG_KIND).map(
      (kind): readonly [RolloutFlagKind, RolloutFlagKind] => [kind, kind],
    ),
  );

registerEnumType(RolloutFlagKindEnum, {
  description:
    'Typed rollout flag kind: boolean | string | number | json. Variation values must match.',
  name: 'RolloutFlagKind',
});
