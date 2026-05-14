import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { PlanDetailCancelPlanRunDocument } from '@openthrottle/openthrottle-developer-codegen';
import { CancelPlanRunInputSchema } from '~/__generated__/schemas';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export const cancelPlanRun = async (args: Route.ActionArgs, planId: string) => {
  try {
    const input = CancelPlanRunInputSchema().parse({ planId });
    const result = await executeGraphqlWithAuth(
      args.request,
      PlanDetailCancelPlanRunDocument,
      { input },
    );

    if (!result.cancelPlanRun) {
      return { cancelPlanRunError: 'Failed to cancel plan run.' };
    }

    return { cancelPlanRun: result.cancelPlanRun };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { cancelPlanRunError: message };
  }
};
