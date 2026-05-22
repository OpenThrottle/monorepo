import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotesToolbar } from '../NotesToolbar';
import type { NotesToolbarProps } from '../NotesToolbar';

describe('NotesToolbar Component', () => {
  let component: RenderResult;
  let props: NotesToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <NotesToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders toolbar shell', () => {
    expect(component.getByTestId('NotesToolbar')).toBeInTheDocument();
  });

  test('renders notes search input', () => {
    expect(
      component.getByRole('searchbox', { name: /search notes/i }),
    ).toBeInTheDocument();
  });

  test('renders Create note link', () => {
    expect(
      component.getByRole('link', { name: /create note/i }),
    ).toHaveAttribute('href', '/notes/create');
  });
});
