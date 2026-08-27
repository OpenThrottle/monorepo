/**
 * @description GraphQL enum for probed editor presence. Values align with
 * {@link EDITOR_PRESENCE_STATES} in @openthrottle/nestjs-repositories.
 *
 * Three states, not a boolean, and the distinction is load-bearing: `NOT_FOUND` is a
 * positive claim about the user's machine, while `UNKNOWN` means the server was not in
 * a position to make one (containerized, unsupported platform, or a failed probe).
 * Clients must render nothing at all for `UNKNOWN` rather than treating it as absence.
 */

import { registerEnumType } from '@nestjs/graphql';
import { EDITOR_PRESENCE_STATES } from '@openthrottle/nestjs-repositories';

export const EditorPresenceStateEnum = {
  INSTALLED: 'installed',
  NOT_FOUND: 'not_found',
  UNKNOWN: 'unknown',
} as const;

export type EditorPresenceStateEnum =
  (typeof EditorPresenceStateEnum)[keyof typeof EditorPresenceStateEnum];

registerEnumType(EditorPresenceStateEnum, {
  description: `Whether an editor appears to be installed on the machine hosting the OpenThrottle server. Advisory only — never a gate on enabling an editor. Supported values: ${EDITOR_PRESENCE_STATES.join(', ')}.`,
  name: 'EditorPresenceState',
  valuesMap: {
    INSTALLED: {
      description: 'The probe found the editor on the host.',
    },
    NOT_FOUND: {
      description:
        "The probe ran on the user's own machine and did not find the editor. Safe to show as an advisory; still never a reason to disable the editor.",
    },
    UNKNOWN: {
      description:
        "The probe could not be trusted, so nothing is claimed either way — the server is containerized (its filesystem is not the user's), the platform has no verified probe, or the probe failed. Clients must render no hint for this state.",
    },
  },
});
