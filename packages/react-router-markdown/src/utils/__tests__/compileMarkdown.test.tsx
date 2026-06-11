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

  test('treats braces, angle brackets and code fences as literal markdown', async () => {
    const options: CompileMarkdownOptions = {
      source: [
        'Use `${GITHUB_TOKEN}` and `<name>` placeholders.',
        '',
        '```bash',
        'pnpm nx g @tools/generators:react --name=<Name>',
        '```',
      ].join('\n'),
    };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByText('${GITHUB_TOKEN}')).toBeInTheDocument();
    expect(
      component.getByText('pnpm nx g @tools/generators:react --name=<Name>'),
    ).toBeInTheDocument();
  });

  test('renders GitHub-flavored markdown tables via remark-gfm', async () => {
    const options: CompileMarkdownOptions = {
      source: '| A | B |\n| - | - |\n| 1 | 2 |',
    };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByRole('table')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'A' }),
    ).toBeInTheDocument();
  });
});
