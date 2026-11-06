import type { AgentTrajectoryLabelRowFragment } from '~/__generated__/graphql';

/** Every identity the server may have stamped as your label's `rater`. */
export interface TrajectoryRaterIdentity {
  readonly email: string | null | undefined;
  readonly githubUsername: string | null | undefined;
  readonly id: string | null | undefined;
}

/**
 * @description Splits a trajectory's labels into yours and other raters'.
 * The server derives `rater` from the signed-in identity (display name, then
 * email, then subject), so a label is yours when its rater is any of your
 * identifiers. `mine` is `null` when you have not labelled the trajectory.
 */
export const splitTrajectoryLabels = (
  labels: readonly AgentTrajectoryLabelRowFragment[],
  identity: TrajectoryRaterIdentity | null,
): {
  readonly mine: AgentTrajectoryLabelRowFragment | null;
  readonly others: readonly AgentTrajectoryLabelRowFragment[];
} => {
  const ids = new Set(
    [identity?.email, identity?.githubUsername, identity?.id].filter(
      (value): value is string => {
        return typeof value === 'string' && value !== '';
      },
    ),
  );
  const mine =
    labels.find((label) => {
      return ids.has(label.rater);
    }) ?? null;
  const others = labels.filter((label) => {
    return label !== mine;
  });

  return { mine, others };
};
