import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocumentDecomposePreview } from '../DocumentDecomposePreview';

describe('DocumentDecomposePreview Component', () => {
  test('renders empty state when proposal is undefined', () => {
    const Component = () => <DocumentDecomposePreview proposal={undefined} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId, getByText } = render(<RoutesStub />);

    expect(getByTestId('DocumentDecomposePreview')).toBeInTheDocument();
    expect(
      getByText(/Parse a document to see a proposed plan/i),
    ).toBeInTheDocument();
  });

  test('renders plan title and tasks when proposal is set', () => {
    const proposal = {
      planDescription: 'Desc',
      planTitle: 'My plan',
      tasks: [
        {
          requirements: ['Do the thing'],
          title: 'Task one',
        },
      ],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <DocumentDecomposePreview proposal={proposal} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByText } = render(<RoutesStub />);

    expect(getByText('My plan')).toBeInTheDocument();
    expect(getByText('Task one')).toBeInTheDocument();
    expect(getByText('Do the thing')).toBeInTheDocument();
  });
});
