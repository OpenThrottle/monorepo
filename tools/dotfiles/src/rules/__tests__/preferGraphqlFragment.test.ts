import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { preferGraphqlFragment } from '../preferGraphqlFragment.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const CODEGEN_IMPORT = `import type {
  CreatePlanMutation,
  GetPlanQuery,
  PlanCardFragment,
  PlanStatus,
} from '~/__generated__/graphql';
`;

const error: { readonly messageId: 'preferFragment' } = {
  messageId: 'preferFragment',
};

const indexingError: { readonly messageId: 'noFragmentIndexing' } = {
  messageId: 'noFragmentIndexing',
};

const aliasError: { readonly messageId: 'noFragmentAlias' } = {
  messageId: 'noFragmentAlias',
};

ruleTester.run('prefer-graphql-fragment', preferGraphqlFragment, {
  invalid: [
    {
      // A chain into a list element reports once, at the outermost access.
      code: `${CODEGEN_IMPORT}
type Task = GetPlanQuery['plan']['tasks'][number];`,
      errors: [{ ...error, data: { name: 'GetPlanQuery' } }],
    },
    {
      // A chain that stops at the list.
      code: `${CODEGEN_IMPORT}
type Tasks = GetPlanQuery['plan']['tasks'];`,
      errors: [error],
    },
    {
      code: `${CODEGEN_IMPORT}
type Plan = GetPlanQuery['plan'];`,
      errors: [error],
    },
    {
      // NonNullable in the middle of the chain does not hide it.
      code: `${CODEGEN_IMPORT}
type Task = NonNullable<GetPlanQuery['plan']['tasks']>[number];`,
      errors: [error],
    },
    {
      // Exclude wrapping the whole chain does not hide it.
      code: `${CODEGEN_IMPORT}
type Plan = Exclude<GetPlanQuery['plan'], null>;`,
      errors: [error],
    },
    {
      code: `${CODEGEN_IMPORT}
interface Props {
  readonly plan: GetPlanQuery['plan'] | undefined;
}`,
      errors: [error],
    },
    {
      code: `${CODEGEN_IMPORT}
type Created = CreatePlanMutation['createPlan'];`,
      errors: [error],
    },
    {
      // An aliased import from a relative, .js-suffixed __generated__ path.
      code: `import type { OnPlanUpdatedSubscription as Sub } from '../__generated__/graphql.js';
type Event = Sub['onPlanUpdated'];`,
      errors: [{ ...error, data: { name: 'Sub' } }],
    },
    {
      // A `*-codegen` package.
      code: `import type { LoaderRootQuery } from '@openthrottle/openthrottle-developer-codegen';
type Viewer = LoaderRootQuery['viewer'];`,
      errors: [error],
    },
    {
      // Two separate chains report twice.
      code: `${CODEGEN_IMPORT}
type A = GetPlanQuery['a'];
type B = CreatePlanMutation['b'][number];`,
      errors: [error, error],
    },
    {
      // Reaching into a fragment for a child structure.
      code: `${CODEGEN_IMPORT}
type Task = PlanCardFragment['tasks'][number];`,
      errors: [{ ...indexingError, data: { name: 'PlanCardFragment' } }],
    },
    {
      // Reaching into a fragment for a scalar field.
      code: `${CODEGEN_IMPORT}
type Title = PlanCardFragment['title'];`,
      errors: [indexingError],
    },
    {
      code: `${CODEGEN_IMPORT}
interface Props {
  readonly tasks: NonNullable<PlanCardFragment['tasks']>;
}`,
      errors: [indexingError],
    },
    {
      code: `${CODEGEN_IMPORT}
type Plan = PlanCardFragment;`,
      errors: [{ ...aliasError, data: { name: 'PlanCardFragment' } }],
    },
    {
      code: `${CODEGEN_IMPORT}
type Plans = readonly PlanCardFragment[];`,
      errors: [aliasError],
    },
    {
      code: `${CODEGEN_IMPORT}
type Plans = ReadonlyArray<PlanCardFragment>;`,
      errors: [aliasError],
    },
    {
      code: `${CODEGEN_IMPORT}
type MaybePlan = NonNullable<PlanCardFragment> | null | undefined;`,
      errors: [aliasError],
    },
    {
      // Renaming the fragment on import is an alias too.
      code: `import type { PlanCardFragment as Plan } from '~/__generated__/graphql';
interface Props {
  readonly plan: Plan;
}`,
      errors: [{ ...aliasError, data: { name: 'PlanCardFragment' } }],
    },
  ],
  valid: [
    `${CODEGEN_IMPORT}
interface Props {
  readonly plan: PlanCardFragment;
}`,
    `${CODEGEN_IMPORT}
interface Props {
  readonly plans: readonly PlanCardFragment[];
}`,
    // A type that says more than the fragment is not a rename of it.
    `${CODEGEN_IMPORT}
type PlanOrStatus = PlanCardFragment | PlanStatus;`,
    `${CODEGEN_IMPORT}
type ById = Record<string, PlanCardFragment>;`,
    // A local type whose name ends in Fragment.
    `interface CodeFragment { readonly lines: readonly string[] }
type Line = CodeFragment['lines'][number];
type Alias = CodeFragment;`,
    `${CODEGEN_IMPORT}
type Status = PlanStatus['Pending'];`,
    // The whole operation type is fine.
    `${CODEGEN_IMPORT}
type Data = GetPlanQuery | undefined;`,
    // A local type whose name ends in Query.
    `interface SearchQuery { readonly results: readonly string[] }
type Result = SearchQuery['results'][number];`,
    // An operation-shaped name from a non-codegen module.
    `import type { UseQuery } from '@tanstack/react-query';
type Data = UseQuery['data'];`,
  ],
});
