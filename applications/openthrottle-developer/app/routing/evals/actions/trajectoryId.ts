import { toErrorMessageOr } from '@openthrottle/nodejs-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';

import {
  TrajectoryViewerLabelDocument,
  TrajectoryViewerRemoveLabelDocument,
} from '~/__generated__/graphql';
import { LabelAgentTrajectoryInputSchema } from '~/__generated__/schemas';
import { TRAJECTORY_LABEL_INTENT } from '~/routing/evals/config/defaults';
import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/copy';
import type {
  TrajectoryLabelActionFailure,
  TrajectoryLabelRemoved,
  TrajectoryLabelSaved,
} from '~/routing/evals/types';
import { parseTrajectoryVerdict } from '~/routing/evals/utils/parsers';

/** What the label actions need from a route's action args. */
interface TrajectoryLabelActionArgs {
  readonly request: Request;
}

/**
 * @description Records (or replaces) your label on a trajectory. The
 * trajectory id comes from the route, the rater from your identity on the
 * server; only verdict, failure type and note are read from the form.
 */
const labelTrajectory = async (
  args: TrajectoryLabelActionArgs,
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
      error: toErrorMessageOr(error, 'Failed to save the label.'),
      ok: false,
    };
  }
};

/**
 * @description Removes your own label on a trajectory; other raters' labels
 * are never touched (the server scopes the delete to your identity).
 */
const removeTrajectoryLabel = async (
  args: TrajectoryLabelActionArgs,
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
      error: toErrorMessageOr(error, 'Failed to remove the label.'),
      ok: false,
    };
  }
};

/**
 * @description The action body both trajectory viewer routes share: reads the
 * form's `intent` and labels, removes your label, or refuses an unknown one.
 * The caller checks the feature flag first.
 */
export const handleTrajectoryLabelAction = async (
  args: TrajectoryLabelActionArgs,
  trajectoryId: string,
): Promise<
  TrajectoryLabelActionFailure | TrajectoryLabelRemoved | TrajectoryLabelSaved
> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case TRAJECTORY_LABEL_INTENT.label:
      return labelTrajectory(args, trajectoryId, formData);
    case TRAJECTORY_LABEL_INTENT.remove:
      return removeTrajectoryLabel(args, trajectoryId);
    default:
      return { error: 'Unknown action.', ok: false };
  }
};
