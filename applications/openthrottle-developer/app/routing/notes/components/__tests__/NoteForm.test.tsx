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

    test('renders form with content and optional author fields', () => {
      expect(component.getByTestId('NoteForm')).toBeInTheDocument();
      expect(component.getByLabelText('Content')).toBeInTheDocument();
      expect(
        component.getByLabelText(/author \(optional\)/i),
      ).toBeInTheDocument();
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
});
