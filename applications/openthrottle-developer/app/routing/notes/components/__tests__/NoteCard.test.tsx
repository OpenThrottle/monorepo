import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NoteCard } from '../NoteCard';
import type { NoteCardProps } from '../NoteCard';

describe('NoteCard Component', () => {
  let component: RenderResult;
  let props: NoteCardProps;

  beforeEach(() => {
    props = {
      note: {
        content: 'Note 1 content',
        createdAt: new Date(),
        id: 'note-1',
        updatedAt: new Date(),
      },
    };

    const Component = () => <NoteCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render note content and link to detail', () => {
    expect(component.getByTestId('NoteCard')).toBeInTheDocument();
    expect(component.getByText('Note 1 content')).toBeInTheDocument();
    const viewLink = component.getByRole('link', { name: /view note/i });
    expect(viewLink).toHaveAttribute('href', '/notes/note-1');
  });
});
