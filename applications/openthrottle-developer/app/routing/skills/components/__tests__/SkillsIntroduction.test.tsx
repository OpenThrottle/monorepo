import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsIntroduction } from '../SkillsIntroduction';
import { SKILLS_COPY } from '~/routing/skills/data/data.copy';

describe('SkillsIntroduction Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <SkillsIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the page title as the top-level heading', () => {
    expect(
      component.getByRole('heading', {
        level: 1,
        name: SKILLS_COPY.pageTitle,
      }),
    ).toBeInTheDocument();
  });

  test('renders the explanatory copy', () => {
    expect(
      component.getByText(SKILLS_COPY.pageDescription),
    ).toBeInTheDocument();
  });

  test('renders the onboarding trigger so the pitch stays reachable', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });
});
