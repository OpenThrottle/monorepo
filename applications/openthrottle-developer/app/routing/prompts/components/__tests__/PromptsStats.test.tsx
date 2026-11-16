import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PROMPTS_STATS_COPY } from '~/routing/prompts/data/data.copy';

import { PromptsStats } from '../PromptsStats';

describe('PromptsStats Component', () => {
  test('renders a card per prompt type plus the total', () => {
    const Component = () => {
      return (
        <PromptsStats
          countPersonas={4}
          countPrompts={16}
          countSkills={20}
          total={40}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('PromptsStats')).toBeInTheDocument();
    expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(4);
    expect(component.getByText(PROMPTS_STATS_COPY.prompts)).toBeInTheDocument();
    expect(component.getByText(PROMPTS_STATS_COPY.skills)).toBeInTheDocument();
    expect(
      component.getByText(PROMPTS_STATS_COPY.personas),
    ).toBeInTheDocument();
    expect(component.getByText(PROMPTS_STATS_COPY.total)).toBeInTheDocument();
    expect(component.getByText(/^16$/)).toBeInTheDocument();
    expect(component.getByText(/^20$/)).toBeInTheDocument();
    expect(component.getByText(/^4$/)).toBeInTheDocument();
    expect(component.getByText(/^40$/)).toBeInTheDocument();
  });
});
