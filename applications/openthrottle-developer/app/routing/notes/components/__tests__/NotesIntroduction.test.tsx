import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { NotesIntroduction } from '../NotesIntroduction';

describe('NotesIntroduction Component', () => {
  test('renders notes heading and intro copy', () => {
    const Component = () => {
      return <NotesIntroduction />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: 'Notes' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/unstructured thoughts and ideas/i),
    ).toBeInTheDocument();
  });
});
