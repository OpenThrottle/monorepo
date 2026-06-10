import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { MarkdownRendererProps } from '../MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  let component: RenderResult;
  let props: MarkdownRendererProps;

  beforeEach(() => {
    props = { source: '# Hello world\n\nA paragraph.' };

    component = render(<MarkdownRenderer {...props} />);
  });

  test('should render the container', () => {
    expect(component.getByTestId('MarkdownRenderer')).toBeInTheDocument();
  });

  test('should render compiled markdown content', async () => {
    const heading = await component.findByRole('heading', { level: 1 });

    expect(heading).toHaveTextContent('Hello world');
    expect(component.getByText('A paragraph.')).toBeInTheDocument();
  });
});
