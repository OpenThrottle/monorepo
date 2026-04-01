import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NoteForm } from '../NoteForm';
import type { NoteFormProps } from '../NoteForm';

describe('NoteForm Component', () => {
  let component: RenderResult;
  let props: NoteFormProps;

  beforeEach(() => {
    props = {
      action: 'create',
    };

    const Component = () => <NoteForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render create form with content field', () => {
    expect(component.getByTestId('NoteForm')).toBeInTheDocument();
    expect(component.getByLabelText('Content')).toBeInTheDocument();
  });
});
