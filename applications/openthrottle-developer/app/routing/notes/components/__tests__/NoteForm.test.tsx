import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { NoteForm } from '../NoteForm';
import type { NoteFormProps } from '../NoteForm';
import { renderRoutesStub } from '~/testing/route-fixtures';

describe('NoteForm Component', () => {
  describe('when action is create', () => {
    let component: RenderResult;

    beforeEach(() => {
      const props: NoteFormProps = { action: 'create' };
      component = renderRoutesStub(<NoteForm {...props} />);
    });

    test('renders the content field and no author input', () => {
      expect(component.getByTestId('NoteForm')).toBeInTheDocument();
      expect(component.getByLabelText('Content')).toBeInTheDocument();
      // The server derives the author from the request principal, so there is
      // nothing for the user to type and nothing to spoof.
      expect(component.queryByLabelText(/author/i)).toBeNull();
    });

    test('shows who the note will be attributed to when the name is known', () => {
      const props: NoteFormProps = {
        action: 'create',
        authorName: 'visormatt',
      };
      const withAuthor = renderRoutesStub(<NoteForm {...props} />);

      expect(withAuthor.getByText('Author: visormatt')).toBeInTheDocument();
      expect(withAuthor.queryByLabelText(/author/i)).toBeNull();
    });

    test('omits the attribution line when the name is unknown', () => {
      expect(component.queryByText(/^Author:/)).toBeNull();
    });

    test('content field is required', () => {
      expect(component.getByLabelText('Content')).toBeRequired();
    });

    test('renders create submit label and cancel link to notes index', () => {
      expect(
        component.getByRole('button', { name: /create note/i }),
      ).toBeInTheDocument();
      const cancel = component.getByRole('link', { name: /cancel/i });
      expect(cancel).toHaveAttribute('href', '/notes');
    });
  });

  describe('when action is update', () => {
    test('renders update submit label and prefills fields from note', () => {
      const props: NoteFormProps = {
        action: 'update',
        note: {
          author: 'alpha',
          content: 'Body text',
          createdAt: new Date(),
          id: 'n-42',
          updatedAt: new Date(),
        },
      };
      const component = renderRoutesStub(<NoteForm {...props} />);

      expect(
        component.getByRole('button', { name: /update note/i }),
      ).toBeInTheDocument();
      expect(component.getByLabelText('Content')).toHaveValue('Body text');
      expect(component.getByLabelText(/author \(optional\)/i)).toHaveValue(
        'alpha',
      );
    });

    test('prefills empty author when note has no author', () => {
      const props: NoteFormProps = {
        action: 'update',
        note: {
          content: 'Only body',
          createdAt: new Date(),
          id: 'n-99',
          updatedAt: new Date(),
        },
      };
      const component = renderRoutesStub(<NoteForm {...props} />);
      expect(component.getByLabelText(/author \(optional\)/i)).toHaveValue('');
    });
  });

  describe('error feedback', () => {
    test('surfaces an action-level error inline as an alert', () => {
      const props: NoteFormProps = {
        action: 'update',
        error: 'Could not update the note. Please try again.',
      };
      const component = renderRoutesStub(<NoteForm {...props} />);

      expect(component.getByRole('alert')).toHaveTextContent(
        'Could not update the note. Please try again.',
      );
    });

    test('renders no alert when there is no error', () => {
      const props: NoteFormProps = { action: 'create' };
      const component = renderRoutesStub(<NoteForm {...props} />);

      expect(component.queryByRole('alert')).toBeNull();
    });
  });
});
