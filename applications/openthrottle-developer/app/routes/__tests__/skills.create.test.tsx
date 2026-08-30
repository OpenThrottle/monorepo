import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import SkillsCreate from '../skills.create';
import type { Route } from '@/app/routes/+types/skills.create';

// Monaco cannot boot under jsdom.
vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: () => <textarea data-testid="mock-monaco" />,
}));

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills.create',
    loaderData: {},
    params: {},
    pathname: '/skills/create',
  },
];

// A data router, not MemoryRouter: the form hook uses `useFetcher`.
// eslint-disable-next-line react/no-multi-comp -- test-local harness component
const Component = (): React.ReactElement => (
  <SkillsCreate
    actionData={undefined}
    loaderData={{}}
    matches={matches}
    params={{}}
  />
);

describe('routes/skills.create.tsx', () => {
  test('renders the create-skill screen', () => {
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: SKILL_CREATE_COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(component.getByTestId('SkillCreateForm')).toBeInTheDocument();
  });
});
