import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId.trajectories.$trajectoryId';
import {
  TrajectoryViewerLabelDocument,
  TrajectoryViewerRemoveLabelDocument,
} from '~/__generated__/graphql';
import { LabelAgentTrajectoryInputSchema } from '~/__generated__/schemas';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import type {
  TrajectoryLabelActionFailure,
  TrajectoryLabelRemoved,
  TrajectoryLabelSaved,
} from '~/routing/evals/types';
import { parseTrajectoryVerdict } from '~/routing/evals/utils/parsers';

/**
 * @description Records (or replaces) your label on a trajectory. The
 * trajectory id comes from the route, the rater from your identity on the
 * server; only verdict, failure type and note are read from the form.
 */
export const labelTrajectory = async (
  args: Route.ActionArgs,
  trajectoryId: string,
  formData: FormData,
): Promise<TrajectoryLabelActionFailure | TrajectoryLabelSaved> => {
  const parsed = parseFormData(
    formData,
    LabelAgentTrajectoryInputSchema().omit({ trajectoryId: true }),
  );

  if (!parsed.success) {
    return { error: parsed.error, ok: false };
  }

  const verdict = parseTrajectoryVerdict(parsed.data.verdict);

  if (verdict === null) {
    return { error: TRAJECTORY_LABEL_COPY.verdictRequired, ok: false };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      TrajectoryViewerLabelDocument,
      {
        input: {
          failureType: parsed.data.failureType ?? null,
          note: parsed.data.note ?? null,
          trajectoryId,
          verdict,
        },
      },
    );

    return { label: result.labelAgentTrajectory, ok: true };
  } catch (error) {
    return {
      error: toErrorMessage(error, 'Failed to save the label.'),
      ok: false,
    };
  }
};

/**
 * @description Removes your own label on a trajectory; other raters' labels
 * are never touched (the server scopes the delete to your identity).
 */
export const removeTrajectoryLabel = async (
  args: Route.ActionArgs,
  trajectoryId: string,
): Promise<TrajectoryLabelActionFailure | TrajectoryLabelRemoved> => {
  try {
    await executeGraphqlWithAuth(
      args.request,
      TrajectoryViewerRemoveLabelDocument,
      { trajectoryId },
    );

    return { ok: true };
  } catch (error) {
    return {
      error: toErrorMessage(error, 'Failed to remove the label.'),
      ok: false,
    };
  }
};
