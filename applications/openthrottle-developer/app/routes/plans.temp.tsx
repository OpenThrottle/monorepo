import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Form } from 'react-router';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.temp';
import {
  RalphNestedDebugCli,
  TestWorkflowDocument,
} from '~/__generated__/graphql';

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

      <div className="max-w-3xl mx-auto">
        <Form
          className="flex flex-col gap-4 bg-accent-foreground"
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

  console.log('action', formData);

  const result = await executeGraphqlWithAuth(
    args.request,
    TestWorkflowDocument,
    {
      input: {
        planId: (formData.get('planId') as string) ?? '',
        ralph: {
          ralphDebugCli: RalphNestedDebugCli.Verbose,
        },
      },
    },
  );

  console.log('result', result);

  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
