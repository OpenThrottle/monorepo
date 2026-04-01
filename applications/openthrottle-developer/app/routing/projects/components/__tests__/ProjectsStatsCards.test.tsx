import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProjectsStatsCards } from '../ProjectsStatsCards';
import type { ProjectsStatsCardsProps } from '../ProjectsStatsCards';

describe('ProjectsStatsCards Component', () => {
  describe('when only total projects is set', () => {
    let component: RenderResult;
    let props: ProjectsStatsCardsProps;

    beforeEach(() => {
      props = {
        totalProjects: 3,
      };

      const Component = () => <ProjectsStatsCards {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should render total projects and optional plans linked cards', () => {
      expect(component.getByTestId('ProjectsStatsCards')).toBeInTheDocument();
      expect(component.getByText('Total projects')).toBeInTheDocument();
      expect(component.getByText('3')).toBeInTheDocument();
      expect(component.queryByText('Plans linked')).not.toBeInTheDocument();
      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(1);
    });
  });

  describe('when plansLinkedCount is provided', () => {
    test('should show plans linked card when plansLinkedCount is provided', () => {
      const WithPlans = () => (
        <ProjectsStatsCards plansLinkedCount={5} totalProjects={2} />
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
});
