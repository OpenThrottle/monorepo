import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { Tabs } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import { GeneratorTabSchema } from '../GeneratorTabSchema';

function renderTab(generator: GeneratorDetailCardFragment): RenderResult {
  const Component = () => (
    <Tabs defaultValue="schema">
      <GeneratorTabSchema generator={generator} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('GeneratorTabSchema', () => {
  describe('when schemaJson is null or empty', () => {
    test('shows an empty code block after expanding', async () => {
      const user = userEvent.setup();
      const view = renderTab({
        __typename: 'GeneratorDetailObject',
        description: 'd',
        name: 'g',
        schemaJson: null,
      });

      await user.click(view.getByRole('button', { name: 'Show schema' }));

      const code = view.container.querySelector('pre code');
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toBe('');
    });
  });

  describe('when schemaJson is valid JSON', () => {
    test('pretty-prints JSON inside the collapsible', async () => {
      const user = userEvent.setup();
      const view = renderTab({
        __typename: 'GeneratorDetailObject',
        description: 'd',
        name: 'g',
        schemaJson: '{"a":1}',
      });

      await user.click(view.getByRole('button', { name: 'Show schema' }));

      const block = view.container.querySelector('pre code');
      expect(block?.textContent).toContain('"a"');
      expect(block?.textContent).toContain('1');
    });
  });

  describe('when schemaJson is not valid JSON', () => {
    test('shows the raw string', async () => {
      const user = userEvent.setup();
      const raw = '{ not json';
      const view = renderTab({
        __typename: 'GeneratorDetailObject',
        description: 'd',
        name: 'g',
        schemaJson: raw,
      });

      await user.click(view.getByRole('button', { name: 'Show schema' }));

      expect(view.getByText(raw)).toBeInTheDocument();
    });
  });
});
