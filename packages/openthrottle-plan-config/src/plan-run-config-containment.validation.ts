/**
 * @description Zod schema for the `containment` key shared by the storage and snapshot run-config
 * schemas.
 */

import { z } from 'zod';

import {
  MAX_PLAN_RUN_CONTAINMENT_HOST_LEN,
  MAX_PLAN_RUN_CONTAINMENT_HOSTS,
  PLAN_RUN_CONTAINMENT_FILESYSTEM_MODES,
  PLAN_RUN_CONTAINMENT_HOST_REGEX,
} from './plan-run-config-containment.constants.ts';

const containmentHostSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(MAX_PLAN_RUN_CONTAINMENT_HOST_LEN)
  .regex(PLAN_RUN_CONTAINMENT_HOST_REGEX, {
    message: `must be a bare host name (optionally *.-prefixed), with no scheme, port or path`,
  });

const containmentNetworkSchema = z.discriminatedUnion('mode', [
  z
    .object({
      hosts: z
        .array(containmentHostSchema)
        .max(MAX_PLAN_RUN_CONTAINMENT_HOSTS)
        .transform((hosts) => {
          return [...new Set(hosts)].sort();
        }),
      mode: z.literal('allowlist'),
    })
    .strict(),
  z.object({ mode: z.literal('deny') }).strict(),
  z.object({ mode: z.literal('unrestricted') }).strict(),
]);

export const planRunConfigContainmentSchema = z
  .object({
    filesystem: z.enum(PLAN_RUN_CONTAINMENT_FILESYSTEM_MODES),
    network: containmentNetworkSchema,
  })
  .strict();
