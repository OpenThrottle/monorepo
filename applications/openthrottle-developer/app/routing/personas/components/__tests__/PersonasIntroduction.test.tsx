import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PersonasIntroduction } from '../PersonasIntroduction';

describe('PersonasIntroduction Component', () => {
  test('renders personas heading and intro copy', () => {
    const Component = () => {
      return (
        <PersonasIntroduction
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

    expect(
      component.getByRole('heading', { name: 'Personas' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/Disk-backed prompt profiles/i),
    ).toBeInTheDocument();
  });
});
