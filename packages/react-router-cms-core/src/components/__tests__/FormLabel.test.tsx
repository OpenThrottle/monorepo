import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { FORM_FIELD_COPY } from '../../data/data.copy';
import { FormLabel } from '../FormLabel';

describe('FormLabel', () => {
  describe('for a nested field', () => {
    test('labels the input and marks it required', () => {
      const component = render(
        <>
          <FormLabel
            className={undefined}
            copy="title"
            parent={false}
            required={true}
          />
          <input id="title" />
        </>,
      );

      expect(component.getByLabelText(/title/)).toBe(
        component.getByRole('textbox'),
      );
      expect(
        component.getByText(FORM_FIELD_COPY.requiredMark),
      ).toBeInTheDocument();
    });
  });

  describe('for a top-level field', () => {
    test('renders nothing, since the accordion pane labels it', () => {
      const component = render(
        <FormLabel
          className={undefined}
          copy="title"
          parent={true}
          required={false}
        />,
      );

      expect(component.container).toBeEmptyDOMElement();
    });
  });
});
