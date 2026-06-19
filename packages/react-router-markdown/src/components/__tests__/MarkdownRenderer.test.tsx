import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
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

  test('should render compiled markdown content synchronously (no effect deferral)', () => {
    // `getByRole` (sync) rather than `findByRole`: content must be present on
    // the first render, proving compilation is not deferred to a client effect.
    const heading = component.getByRole('heading', { level: 1 });

    expect(heading).toHaveTextContent('Hello world');
    expect(component.getByText('A paragraph.')).toBeInTheDocument();
  });

  test('should produce compiled content in server-rendered HTML (SSR/SEO)', () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer source={'# Server heading\n\nServer body.'} />,
    );

    expect(html).toMatch(/<h1[^>]*>Server heading<\/h1>/);
    expect(html).toContain('Server body.');
  });
});
