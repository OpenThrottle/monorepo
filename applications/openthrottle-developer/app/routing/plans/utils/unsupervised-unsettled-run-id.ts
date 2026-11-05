export interface UnsupervisedRunRow {
  readonly heartbeatExpected: boolean | null | undefined;
  readonly id: string;
  readonly status: string;
}

/**
 * @description Three states, like the stale badge: `undefined` while the run
 * history is still loading (`rows` absent), `null` when the newest run is not an
 * unsupervised, unsettled one, else that run's id. An interactive run
 * (`heartbeatExpected` false) has no heartbeat to expire, so it never reads as
 * stale and the toolbar offers Settle for it instead.
 */
export const getUnsupervisedUnsettledRunId = (
  rows: readonly UnsupervisedRunRow[] | undefined,
): string | null | undefined => {
  if (rows === undefined) {
    return undefined;
  }

  const newestRun = rows[0];
  if (newestRun === undefined) {
    return null;
  }

  const isUnsupervised = newestRun.heartbeatExpected === false;
  const isInProgress = newestRun.status === 'IN_PROGRESS';
  if (isUnsupervised && isInProgress) {
    return newestRun.id;
  }

  return null;
};
