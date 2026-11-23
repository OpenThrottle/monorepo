import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Form } from 'react-router';

import type { Route } from '@/app/routes/+types/plans.temp';
import { TestWorkflowDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { PlanTempFormSchema } from '~/routing/plans/utils/PlanTempFormSchema';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `TEMP | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers
  // const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();

  //   const formData = new FormData(event.currentTarget);
  //   const planId = formData.get('planId');

  //   console.log('handleSubmit', { formData, planId });
  // };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <OpenThrottleBreadcrumbs
        children="Edit Plan"
        className="mb-4"
        links={[{ children: 'Plans', to: '/plans' }]}
      />

      <div className="mx-auto max-w-3xl">
        <Form
          className="bg-accent-foreground flex flex-col gap-4"
          method="post"
          // onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label className="cursor-pointer" htmlFor="planId">
              Plan ID
            </Label>
            <Input id="planId" name="planId" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline">
              Submit
            </Button>
          </div>
        </Form>
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const parsed = parseFormData(formData, PlanTempFormSchema);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const { branch, planId } = parsed.data;

  await executeGraphqlWithAuth(args.request, TestWorkflowDocument, {
    input: {
      branch,
      planId,
    },
  });

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
