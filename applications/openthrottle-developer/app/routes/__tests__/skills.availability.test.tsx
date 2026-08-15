import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../skills.availability';
import type { Route } from '@/app/routes/+types/skills.availability';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills.availability',
    loaderData: {
      posture: null,
      projectId: null,
      projectName: null,
      rules: [],
      vocabulary: [],
    },
    params: {},
    pathname: '/skills/availability',
  },
];

const renderRoute = (
  loaderData: Route.ComponentProps['loaderData'],
): ReturnType<typeof render> => {
  const Stub = createRoutesStub([
    {
      Component: () => (
        <TooltipProvider>
          <Component
            actionData={undefined}
            loaderData={loaderData}
            matches={matches}
            params={{}}
          />
        </TooltipProvider>
      ),
      action: async () => ({ intent: 'noop', ok: true }),
      path: '/skills/availability',
    },
  ]);
  return render(<Stub initialEntries={['/skills/availability']} />);
};

describe('routes/skills.availability.tsx', () => {
  test('renders the page heading and a back link', () => {
    const view = renderRoute({
      posture: null,
      projectId: 'p1',
      projectName: 'monorepo',
      rules: [],
      vocabulary: [],
    });

    expect(
      view.getByRole('heading', { name: 'Skill availability' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: /Back to skills/i })).toHaveAttribute(
      'href',
      '/skills',
    );
  });

  test('no longer renders the tag-vocabulary manager (moved to /skills/vocabulary)', () => {
    const view = renderRoute({
      posture: null,
      projectId: 'p1',
      projectName: 'monorepo',
      rules: [],
      vocabulary: [{ id: 't1', tag: 'github' }],
    });

    expect(
      view.queryByTestId('SkillTagVocabularyManager'),
    ).not.toBeInTheDocument();
  });

  test('shows the no-project notice when the dogfood project is absent', () => {
    const view = renderRoute({
      posture: null,
      projectId: null,
      projectName: null,
      rules: [],
      vocabulary: [],
    });

    expect(view.getByText(/No dogfood project/i)).toBeInTheDocument();
  });
});
