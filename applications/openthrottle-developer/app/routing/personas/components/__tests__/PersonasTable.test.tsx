import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PersonasTable } from '../PersonasTable';

describe('PersonasTable Component', () => {
  test('renders table region', () => {
    const Component = () => {
      return (
        <PersonasTable
          entries={[
            {
              repoRelativePath: '.agents/personas/architect.md',
              slug: 'architect',
              summary: 'Architecture lens.',
            },
          ]}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('PersonasTable')).toBeInTheDocument();
  });
});
