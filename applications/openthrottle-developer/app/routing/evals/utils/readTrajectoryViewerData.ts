/**
 * @description The loader half both trajectory viewer routes share: parse the
 * stored document on the server and split your label from other raters'.
 */
import type {
  AgentTrajectoryLabelRowFragment,
  TrajectoryViewerMeFragment,
} from '~/__generated__/graphql';
import type { AtifTrajectory } from '~/routing/evals/types';
import { splitTrajectoryLabels } from '~/routing/evals/utils/labels';

export interface ReadTrajectoryViewerDataInput<
  TRecord extends { readonly trajectoryJson: string },
> {
  readonly labels: readonly AgentTrajectoryLabelRowFragment[];
  /** The signed-in user; `null` when the request has no identity. */
  readonly me: TrajectoryViewerMeFragment | null | undefined;
  readonly record: TRecord;
}

export interface TrajectoryViewerData<TSummary> {
  readonly labels: ReturnType<typeof splitTrajectoryLabels>;
  /** The record without its document. */
  readonly summary: TSummary;
  /** The parsed ATIF document; `null` when it could not be read. */
  readonly trajectory: AtifTrajectory | null;
}

/**
 * @description Turns a fetched trajectory, its labels and `me` into what the
 * viewer renders. The ATIF parser is node-only, so it is imported here, on the
 * server, and the client only ever receives the plain document.
 */
export const readTrajectoryViewerData = async <
  TRecord extends { readonly trajectoryJson: string },
>(
  input: ReadTrajectoryViewerDataInput<TRecord>,
): Promise<TrajectoryViewerData<Omit<TRecord, 'trajectoryJson'>>> => {
  const { parseTrajectoryDocument } =
    await import('~/routing/evals/utils/parseTrajectoryDocument.server');
  const { trajectoryJson, ...summary } = input.record;
  const { me } = input;
  const identity = me
    ? { email: me.email, githubUsername: me.githubUsername, id: me.id }
    : null;

  return {
    labels: splitTrajectoryLabels(input.labels, identity),
    summary,
    trajectory: parseTrajectoryDocument(trajectoryJson),
  };
};
