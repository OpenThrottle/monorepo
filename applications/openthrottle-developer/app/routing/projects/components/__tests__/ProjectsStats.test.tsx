import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectsStats } from '../ProjectsStats';
import type { ProjectsStatsProps } from '../ProjectsStats';

describe('ProjectsStats Component', () => {
  describe('when only total projects is set', () => {
    let component: RenderResult;
    let props: ProjectsStatsProps;

    beforeEach(() => {
      props = {
        totalProjects: 3,
      };

      const Component = () => <ProjectsStats {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    // "Tasks linked" used to render unconditionally with a hardcoded 123 behind a
    // TODO. Both linked counts are now real and both are omitted when absent — a
    // missing count must show no card rather than an invented number.
    test('should render only the total projects card', () => {
      expect(component.getByTestId('ProjectsStats')).toBeInTheDocument();
      expect(component.getByText('Total projects')).toBeInTheDocument();
      expect(component.getByText('3')).toBeInTheDocument();
      expect(component.queryByText('Tasks linked')).not.toBeInTheDocument();
      expect(component.queryByText('Plans linked')).not.toBeInTheDocument();
      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(1);
    });
  });

  describe('when plansLinkedCount is provided', () => {
    test('should show plans linked card when plansLinkedCount is provided', () => {
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const WithPlans = () => (
        <ProjectsStats plansLinkedCount={5} totalProjects={2} />
      );
      const RoutesStubWithPlans = createRoutesStub([
        { Component: WithPlans, path: '/' },
      ]);
      const { getAllByTestId, getByText } = render(<RoutesStubWithPlans />);
      expect(getByText('Total projects')).toBeInTheDocument();
      expect(getByText('2')).toBeInTheDocument();
      expect(getByText('Plans linked')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument();
      expect(getAllByTestId('OpenThrottleStatCard')).toHaveLength(2);
    });
  });

  describe('when tasksLinkedCount is provided', () => {
    test('should show the real tasks linked count', () => {
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const WithBoth = () => (
        <ProjectsStats
          plansLinkedCount={10}
          tasksLinkedCount={13}
          totalProjects={2}
        />
      );
      const RoutesStubWithBoth = createRoutesStub([
        { Component: WithBoth, path: '/' },
      ]);
      const { getAllByTestId, getByText, queryByText } = render(
        <RoutesStubWithBoth />,
      );

      expect(getByText('Tasks linked')).toBeInTheDocument();
      expect(getByText('13')).toBeInTheDocument();
      // The number the card used to hardcode.
      expect(queryByText('123')).not.toBeInTheDocument();
      expect(getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
    });
  });
});
