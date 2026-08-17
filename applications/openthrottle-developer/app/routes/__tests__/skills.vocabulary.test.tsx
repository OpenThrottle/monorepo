import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { buildRootMatch } from '~/testing/root-match-fixture';
import {
  SKILL_AVAILABILITY_COPY,
  SKILL_VOCABULARY_COPY,
} from '~/routing/skills/data/data.copy';
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
      view.getByRole('heading', { name: SKILL_VOCABULARY_COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: SKILL_VOCABULARY_COPY.backLink }),
    ).toHaveAttribute('href', '/skills');
  });

  // The rename/remove caveat renders here, appended to the page description,
  // rather than inside SkillTagVocabularyManager — so this route owns it.
  test('renders the page description with the rename/remove caveat', () => {
    const view = renderRoute({ vocabulary: [] });

    expect(
      view.getByText(
        `${SKILL_VOCABULARY_COPY.pageDescription} ${SKILL_AVAILABILITY_COPY.vocabulary.caveat}`,
      ),
    ).toBeInTheDocument();
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
