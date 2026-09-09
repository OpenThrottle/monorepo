/**
 * @description Resolve a parsed artifact view model to a destination.
 *
 * The result is discriminated so the row can pick the right element: an
 * `external` destination needs `<a target="_blank" rel="noreferrer">`, while an
 * `internal` one needs a react-router `<Link>`. Rendering an external URL
 * through `<Link>` would client-side route to a 404 instead of leaving the app.
 *
 * `none` is a first-class outcome — an artifact whose payload carries no usable
 * destination renders as plain text. There are deliberately no dead hrefs here.
 */

import type { LinkedArtifactView } from '~/routing/plans/utils/linked-artifact-payload';

export type LinkedArtifactDestination =
  | { href: string; kind: 'external' }
  | { kind: 'internal'; to: string }
  | { kind: 'none' };

const NO_DESTINATION: LinkedArtifactDestination = { kind: 'none' };

/**
 * GitHub is assumed for git_commit / pull_request because the server derives
 * those external keys as `github:<repo>@<sha>` and `github:<repo>#<n>` — the
 * host is baked into the key format, not carried in the payload. Supporting a
 * non-GitHub forge means teaching the server to record the host first; that is
 * a follow-up, not a branch to guess at here.
 */
const GITHUB_ORIGIN = 'https://github.com';

const external = (href: string): LinkedArtifactDestination => ({
  href,
  kind: 'external',
});

const internal = (to: string): LinkedArtifactDestination => ({
  kind: 'internal',
  to,
});

/**
 * @description Destination for one artifact row.
 *
 * `planId` is an explicit argument because a `status_change` payload for a task
 * carries only the task id — the plan id lives in the route params, not in the
 * ledger row. The util must never invent it; pass `null` when there is none and
 * status_change rows resolve to `none` rather than a broken path.
 * @public
 */
export const toLinkedArtifactDestination = (
  view: LinkedArtifactView,
  planId: string | null,
): LinkedArtifactDestination => {
  switch (view.kind) {
    case 'deployment':
      return view.url === undefined ? NO_DESTINATION : external(view.url);

    case 'document':
      return external(view.url);

    case 'git_commit':
      // Prefer the landed sha: that is the commit that actually exists on the
      // default branch, where a claimed sha may have been squashed away.
      return external(
        `${GITHUB_ORIGIN}/${view.repo}/commit/${view.landedSha ?? view.sha}`,
      );

    case 'plan_promotion':
      return internal(`/plans/${view.newPlanId}`);

    case 'pull_request':
      return external(`${GITHUB_ORIGIN}/${view.repo}/pull/${view.number}`);

    case 'status_change': {
      if (planId === null) {
        return NO_DESTINATION;
      }

      return view.entity === 'plan'
        ? internal(`/plans/${planId}`)
        : internal(`/plans/${planId}/tasks/${view.entityId}`);
    }

    case 'unknown':
    default:
      return NO_DESTINATION;
  }
};
