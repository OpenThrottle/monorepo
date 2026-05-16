import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { NoteCard } from '../NoteCard';
import type { NoteCardProps } from '../NoteCard';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('NoteCard Component', () => {
  describe('with default props', () => {
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

      component = renderRoutesStub(<NoteCard {...props} />);
    });

    test('should render note content and link to detail', () => {
      expect(component.getByTestId('NoteCard')).toBeInTheDocument();
      expect(component.getByText('Note 1 content')).toBeInTheDocument();
      const viewLink = component.getByRole('link', { name: /view note/i });
      expect(viewLink).toHaveAttribute('href', '/notes/note-1');
    });
  });

  test('merges optional className onto the card', () => {
    const props: NoteCardProps = {
      className: 'note-card-extra',
      note: {
        content: 'Note 1 content',
        createdAt: new Date(),
        id: 'note-1',
        updatedAt: new Date(),
      },
    };
    const { getByTestId } = renderRoutesStub(<NoteCard {...props} />);
    expect(getByTestId('NoteCard')).toHaveClass('note-card-extra', 'flex-col');
  });
});
