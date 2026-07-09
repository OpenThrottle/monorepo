import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Tabs } from '@openthrottle/react-router-shadcn';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import { GeneratorTabDebug } from '../GeneratorTabDebug';

const mockGenerator: GeneratorDetailCardFragment = {
  __typename: 'GeneratorDetailObject',
  description: 'Test generator',
  name: 'nestjs',
  schemaJson: null,
};

/** Narrows an element to a textarea, failing the test otherwise. */
function assertTextArea(
  element: HTMLElement,
): asserts element is HTMLTextAreaElement {
  expect(element).toBeInstanceOf(HTMLTextAreaElement);
}

function renderTab(
  generator: GeneratorDetailCardFragment = mockGenerator,
): RenderResult {
  const Component = () => (
    <Tabs defaultValue="debug">
      <GeneratorTabDebug generator={generator} />
    </Tabs>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('GeneratorTabDebug', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders triage instructions and the CLI output textarea', () => {
    const view = renderTab();

    expect(
      view.getByText(/Paste stdout\/stderr from your last/, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      view.getByPlaceholderText(
        /Paste terminal output after running a generator command/,
      ),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'Copy support bundle' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'Clear saved output' }),
    ).toBeInTheDocument();
    expect(
      view.getByText(/Support bundle includes generator name/),
    ).toBeInTheDocument();
  });

  test('persists typed CLI output to localStorage for this generator', async () => {
    const user = userEvent.setup();
    const view = renderTab();
    const key = 'openthrottle-developer:generator-cli-last-run:nestjs';
    const box = view.getByPlaceholderText(
      /Paste terminal output after running a generator command/,
    );

    await user.type(box, 'ERR');

    expect(localStorage.getItem(key)).toBe('ERR');
  });

  test('clear removes saved output and empties the textarea', async () => {
    const user = userEvent.setup();
    const key = 'openthrottle-developer:generator-cli-last-run:nestjs';

    const view = renderTab();
    const box = view.getByPlaceholderText(
      /Paste terminal output after running a generator command/,
    );
    assertTextArea(box);

    await user.type(box, 'x');
    expect(localStorage.getItem(key)).toBe('x');

    await user.click(view.getByRole('button', { name: 'Clear saved output' }));

    expect(box.value).toBe('');
    expect(localStorage.getItem(key)).toBeNull();
  });
});
