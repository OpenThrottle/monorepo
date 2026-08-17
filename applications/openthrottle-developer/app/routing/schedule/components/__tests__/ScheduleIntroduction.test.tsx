import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { ScheduleIntroduction } from '../ScheduleIntroduction';

describe('ScheduleIntroduction Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = (): React.ReactElement => <ScheduleIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the title and description', () => {
    expect(component.getByTestId('ScheduleIntroduction')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: SCHEDULE_COPY.pageTitle }),
    ).toBeInTheDocument();
    expect(
      component.getByText(SCHEDULE_COPY.pageDescription),
    ).toBeInTheDocument();
  });

  // The "New schedule" CTA now lives in the schedule list body, not this
  // header — see routes/__tests__/schedule._index.test.tsx for its coverage.
  test('does not render the New schedule CTA', () => {
    expect(
      component.queryByRole('link', { name: SCHEDULE_COPY.newScheduleAction }),
    ).not.toBeInTheDocument();
  });

  test('renders the onboarding trigger', () => {
    expect(
      component.getByTestId('GlobalFeatureOnboardingTrigger'),
    ).toBeInTheDocument();
  });
});
