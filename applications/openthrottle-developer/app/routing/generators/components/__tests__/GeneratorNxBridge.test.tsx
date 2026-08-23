import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import { GeneratorNxBridge } from '../GeneratorNxBridge';

const baseGenerator: GeneratorDetailCardFragment = {
  __typename: 'GeneratorDetailObject',
  description: 'Desc',
  name: 'react-router',
  schemaJson: '{"a":1}',
};

function renderBridge(
  generator: GeneratorDetailCardFragment = baseGenerator,
): RenderResult {
  return render(<GeneratorNxBridge generator={generator} />);
}

describe('GeneratorNxBridge', () => {
  test('exposes the bridge region for layout and tooling', () => {
    const view = renderBridge();

    expect(view.getByTestId('GeneratorNxBridge')).toBeInTheDocument();
  });

  test('when schemaJson is missing, renders only the shell with no schema card', () => {
    const view = renderBridge({
      __typename: 'GeneratorDetailObject',
      description: 'd',
      name: 'empty',
      schemaJson: null,
    });

    expect(view.getByTestId('GeneratorNxBridge')).toBeInTheDocument();
    expect(view.queryByText('Generator schema (JSON)')).not.toBeInTheDocument();
  });

  test('when schemaJson is present, shows collapsible pretty-printed JSON', async () => {
    const user = userEvent.setup();
    const view = renderBridge();

    expect(view.getByText('Generator schema (JSON)')).toBeInTheDocument();

    await user.click(view.getByRole('button', { name: 'Show schema' }));

    const block = view.container.querySelector('pre code');
    expect(block?.textContent).toContain('"a"');
    expect(block?.textContent).toContain('1');
  });
});
