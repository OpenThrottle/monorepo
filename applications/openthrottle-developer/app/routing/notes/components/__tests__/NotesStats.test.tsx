import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { NOTES_STATS_COPY } from '~/routing/notes/data/copy';

import { NotesStats } from '../NotesStats';

describe('NotesStats Component', () => {
  test('renders a card per count', () => {
    const Component = () => {
      return (
        <NotesStats
          authorCount={3}
          createdLast30Days={12}
          total={40}
          updatedLast7Days={5}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('NotesStats')).toBeInTheDocument();
    expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(4);
    expect(
      component.getByText(NOTES_STATS_COPY.updatedLast7Days),
    ).toBeInTheDocument();
    expect(
      component.getByText(NOTES_STATS_COPY.createdLast30Days),
    ).toBeInTheDocument();
    expect(component.getByText(NOTES_STATS_COPY.authors)).toBeInTheDocument();
    expect(component.getByText(NOTES_STATS_COPY.total)).toBeInTheDocument();
    expect(component.getByText(/^5$/)).toBeInTheDocument();
    expect(component.getByText(/^12$/)).toBeInTheDocument();
    expect(component.getByText(/^3$/)).toBeInTheDocument();
    expect(component.getByText(/^40$/)).toBeInTheDocument();
  });
});
