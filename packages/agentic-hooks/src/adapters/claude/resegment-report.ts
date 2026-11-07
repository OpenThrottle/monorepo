/**
 * Plain-text rendering of a resegment plan and its send result. Pure —
 * strings out.
 */
import type {
  ResegmentSessionPlan,
  ResegmentSessionResult,
} from './resegment-session.ts';

const taskLabel = (taskId: string | null): string => {
  return taskId === null ? 'plan-level' : `task ${taskId}`;
};

/**
 * The counts a resegment is about to act on. Printed before anything is sent,
 * and the whole output of `--dry-run`.
 *
 * @public
 */
export const formatResegmentPlan = ({
  dryRun,
  plan,
}: {
  dryRun: boolean;
  plan: ResegmentSessionPlan;
}): string => {
  const lines = [
    dryRun
      ? `session-trajectory-resegment: DRY RUN for ${plan.sessionId}, nothing will be written`
      : `session-trajectory-resegment: about to write for ${plan.sessionId}`,
    `transcript: ${plan.transcriptPath}`,
    `open (skipped) segments: ${plan.openSegments}; actions: ${plan.actions.length}`,
  ];
  for (const action of plan.actions) {
    if (action.action === 'insert') {
      lines.push(
        `  INSERT  ${taskLabel(action.taskId)}  steps ${action.newStepCount}`,
      );
      continue;
    }
    if (action.action === 'skip') {
      lines.push(
        `  SKIP    ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`,
      );
      continue;
    }
    lines.push(
      `  UPDATE  ${taskLabel(action.taskId)}  id ${action.id}  steps ${action.oldStepCount} -> ${action.newStepCount}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

/**
 * What a send did for one session.
 *
 * @public
 */
export const formatResegmentResult = (
  result: ResegmentSessionResult,
): string => {
  return `${[
    `replaced ${result.replaced}, inserted ${result.inserted}, skipped (identical) ${result.skipped}, failed ${result.failed}`,
  ].join('\n')}\n`;
};
