import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { redirect } from 'react-router';

import {
  ApproveScheduledAgentJobDocument,
  DeleteScheduledAgentJobDocument,
  RunScheduledAgentJobNowDocument,
  SetScheduledAgentJobEnabledDocument,
} from '~/__generated__/graphql';
import type { WebhookIntentResult } from '~/routing/schedule/utils/runWebhookIntent';
import {
  isWebhookIntent,
  runWebhookIntent,
} from '~/routing/schedule/utils/runWebhookIntent';

export type ScheduleJobActionResult =
  | Response
  | WebhookIntentResult
  | { readonly error: string }
  | { readonly ok: true }
  | { readonly ok: true; readonly runId: string };

/**
 * @description Runs one scheduled-job detail action (`intent` form field) and maps a thrown
 * failure to a result. A webhook failure shows inside the webhook form, not in the page-level alert.
 */
export const runScheduleJobAction = async (
  request: Request,
  jobId: string,
): Promise<ScheduleJobActionResult> => {
  const form = await request.formData();
  const intent = form.get('intent');

  try {
    if (intent === 'run-now') {
      const { runScheduledAgentJobNow } = await executeGraphqlWithAuth(
        request,
        RunScheduledAgentJobNowDocument,
        { id: jobId },
      );
      return { ok: true, runId: runScheduledAgentJobNow.id };
    }

    if (intent === 'approve') {
      await executeGraphqlWithAuth(request, ApproveScheduledAgentJobDocument, {
        id: jobId,
      });
      return { ok: true };
    }

    if (isWebhookIntent(intent)) {
      return await runWebhookIntent(request, jobId, intent, form);
    }

    if (intent === 'toggle-enabled') {
      const enabled = form.get('enabled') === 'true';
      await executeGraphqlWithAuth(
        request,
        SetScheduledAgentJobEnabledDocument,
        { input: { enabled, id: jobId } },
      );
      return { ok: true };
    }

    if (intent === 'delete') {
      await executeGraphqlWithAuth(request, DeleteScheduledAgentJobDocument, {
        id: jobId,
      });
      return redirect('/schedule');
    }

    return { error: 'Unknown action.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed.';

    return typeof intent === 'string' && intent.startsWith('webhook-')
      ? { webhookError: message }
      : { error: message };
  }
};
