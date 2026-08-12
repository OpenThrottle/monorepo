import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotesEmpty } from './NotesEmpty';
import type { NotesEmptyProps } from './NotesEmpty';

describe('NotesEmpty Component', () => {
  let component: RenderResult;
  let props: NotesEmptyProps;

  const renderNotesEmpty = (): RenderResult => {
    const RoutesStub = createRoutesStub([
      { Component: () => <NotesEmpty {...props} />, path: '/' },
    ]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {};
    component = renderNotesEmpty();
  });

  test('renders the no-notes-yet state with a create link when there is no search', () => {
    expect(component.getByText('No notes yet')).toBeInTheDocument();
    expect(
      component.getByText('Create your first note to get started.'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Create note' }),
    ).toHaveAttribute('href', '/notes/create');
  });

  test('renders the no-match state with a clear-search link when searching', () => {
    component.unmount();
    props = { search: 'foo' };
    component = renderNotesEmpty();

    expect(
      component.getByText('No notes match your search'),
    ).toBeInTheDocument();
    expect(
      component.getByText('Try clearing the search to see all notes.'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Clear search' }),
    ).toHaveAttribute('href', '/notes');
  });
});
