import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { COMPONENT_PREVIEW_COPY } from '~/routing/components/data/data.copy';

import { ComponentPropsPreview } from '../ComponentPropsPreview';

const renderPreview = (propsSchemaJson: string) => {
  const Component = () => {
    return (
      <ComponentPropsPreview
        className={undefined}
        propsSchemaJson={propsSchemaJson}
        typename="Hero"
        uuid="component-1"
      />
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const SCHEMA = JSON.stringify({
  properties: { title: { type: 'string' } },
  type: 'object',
});

describe('ComponentPropsPreview', () => {
  describe('with a valid schema', () => {
    test('renders a pane per property with every control disabled', () => {
      const component = renderPreview(SCHEMA);
      const preview = component.getByRole('region', {
        name: COMPONENT_PREVIEW_COPY.heading,
      });

      expect(within(preview).getByText('title')).toBeInTheDocument();
      expect(within(preview).queryByRole('alert')).not.toBeInTheDocument();
      within(preview)
        .getAllByRole('button')
        .forEach((button) => {
          expect(button.closest('fieldset')).toBeDisabled();
        });
    });
  });

  describe('with a schema that has no properties', () => {
    test('says the form has no fields', () => {
      const component = renderPreview('{"type":"object"}');

      expect(
        component.getByText(COMPONENT_PREVIEW_COPY.empty),
      ).toBeInTheDocument();
    });
  });

  describe('with a draft that cannot be previewed', () => {
    test.each([
      ['{"type":', 'invalid-json'],
      ['[1, 2]', 'not-an-object'],
      ['{"properties": []}', 'not-a-schema'],
    ] as const)('explains %s instead of crashing', (draft, reason) => {
      const component = renderPreview(draft);

      expect(component.getByRole('alert')).toHaveTextContent(
        COMPONENT_PREVIEW_COPY[reason],
      );
    });
  });
});
