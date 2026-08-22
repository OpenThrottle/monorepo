import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PROMPTS_COPY } from '~/routing/prompts/data/data.copy';
import { PromptsIntroduction } from '../PromptsIntroduction';

describe('PromptsIntroduction Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = (): React.ReactElement => <PromptsIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders page heading and description from PROMPTS_COPY', () => {
    expect(component.getByTestId('PromptsIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 1,
        name: PROMPTS_COPY.pageTitle,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByText(PROMPTS_COPY.pageDescription),
    ).toBeInTheDocument();
  });

  test('renders the onboarding trigger', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });
});
