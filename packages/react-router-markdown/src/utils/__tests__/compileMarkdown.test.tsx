import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { CompileMarkdownOptions } from '../compileMarkdown';
import { compileMarkdown } from '../compileMarkdown';

describe('compileMarkdown', () => {
  test('compiles markdown source into a renderable component', async () => {
    const options: CompileMarkdownOptions = { source: '# Title\n\nBody text.' };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Title',
    );
    expect(component.getByText('Body text.')).toBeInTheDocument();
  });
});
