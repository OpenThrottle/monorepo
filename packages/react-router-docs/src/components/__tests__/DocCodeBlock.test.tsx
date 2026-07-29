import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { describe, expect, test, vi } from 'vitest';
import { DOC_CODE_COMPONENTS } from '../../utils/docCodeComponents';

const source = [
  '```bash',
  'pnpm nx run openthrottle-developer:dev',
  '```',
].join('\n');

describe('DocCodeBlock (code-copy override)', () => {
  test('copies the exact code text to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const component = render(
      <MarkdownRenderer components={DOC_CODE_COMPONENTS} source={source} />,
    );

    await user.click(component.getByRole('button', { name: 'Copy code' }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('pnpm nx run openthrottle-developer:dev'),
    );
  });

  test('renders no copy button when the override is not applied', () => {
    const component = render(<MarkdownRenderer source={source} />);

    expect(
      component.queryByRole('button', { name: 'Copy code' }),
    ).not.toBeInTheDocument();
  });
});
