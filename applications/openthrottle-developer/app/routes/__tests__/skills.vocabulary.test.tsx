import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../skills.vocabulary';
import type { Route } from '@/app/routes/+types/skills.vocabulary';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/skills.vocabulary',
    loaderData: { vocabulary: [] },
    params: {},
    pathname: '/skills/vocabulary',
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
      path: '/skills/vocabulary',
    },
  ]);
  return render(<Stub initialEntries={['/skills/vocabulary']} />);
};

describe('routes/skills.vocabulary.tsx', () => {
  test('renders the page heading and a back link', () => {
    const view = renderRoute({ vocabulary: [] });

    expect(
      view.getByRole('heading', { name: 'Skill tag vocabulary' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: /Back to skills/i })).toHaveAttribute(
      'href',
      '/skills',
    );
  });

  test('renders the tag-vocabulary manager from loader data', () => {
    const view = renderRoute({
      vocabulary: [
        { id: 't1', tag: 'github' },
        { id: 't2', tag: 'pr-review' },
      ],
    });

    expect(view.getByTestId('SkillTagVocabularyManager')).toBeInTheDocument();
    expect(
      view.getByTestId('SkillTagVocabularyRow-github'),
    ).toBeInTheDocument();
    expect(
      view.getByTestId('SkillTagVocabularyRow-pr-review'),
    ).toBeInTheDocument();
  });
});
