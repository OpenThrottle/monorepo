import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { describe, expect, test, vi } from 'vitest';
import { DOC_CODE_COMPONENTS } from '../docCodeComponents';

const source = ['```ts', 'const x = 1;', '```'].join('\n');

describe('DOC_CODE_COMPONENTS', () => {
  test('maps "pre" to a fenced-code override with a copy button', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const component = render(
      <MarkdownRenderer components={DOC_CODE_COMPONENTS} source={source} />,
    );

    const button = component.getByRole('button', { name: 'Copy code' });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('const x = 1;'),
    );
  });

  test('only overrides "pre" (exposes exactly one key)', () => {
    expect(Object.keys(DOC_CODE_COMPONENTS)).toEqual(['pre']);
  });
});
