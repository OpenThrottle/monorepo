import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RULES_COPY } from '../../data/data.copy';
import { RulesStats } from '../RulesStats';
import type { RulesStatsProps } from '../RulesStats';

describe('RulesStats Component', () => {
  describe('when counts are provided', () => {
    let component: RenderResult;
    let props: RulesStatsProps;

    beforeEach(() => {
      props = {
        disabledCount: 2,
        enabledCount: 5,
        totalCount: 7,
      };

      const Component = () => <RulesStats {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should render total, enabled, and disabled stat cards from RULES_COPY', () => {
      expect(component.getByTestId('RulesStats')).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.statsTotalLabel),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.statsEnabledLabel),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.statsDisabledLabel),
      ).toBeInTheDocument();
      expect(component.getByText(/^7$/)).toBeInTheDocument();
      expect(component.getByText(/^5$/)).toBeInTheDocument();
      expect(component.getByText(/^2$/)).toBeInTheDocument();
      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
    });
  });

  describe('when all counts are zero', () => {
    test('should still render three cards with zero values', () => {
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const ZeroStats = () => (
        <RulesStats disabledCount={0} enabledCount={0} totalCount={0} />
      );
      const RoutesStub = createRoutesStub([
        { Component: ZeroStats, path: '/' },
      ]);
      const zeroComponent = render(<RoutesStub />);

      expect(zeroComponent.getByTestId('RulesStats')).toBeInTheDocument();
      expect(zeroComponent.getAllByText(/^0$/)).toHaveLength(3);
      expect(zeroComponent.getAllByTestId('OpenThrottleStatCard')).toHaveLength(
        3,
      );
    });
  });
});
