import * as React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { MarkdownRendererProps } from '../MarkdownRenderer';
import * as compileMarkdownModule from '../../utils/compileMarkdown';

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

describe('MarkdownRenderer Component — error degradation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders a role="alert" with the compile error message when compilation throws', () => {
    // `evaluateSync` rarely throws for CommonMark (`format: 'md'`), so drive
    // the error branch deterministically by forcing the compile to throw —
    // proving the try/catch degrades to an alert instead of crashing the route.
    vi.spyOn(compileMarkdownModule, 'compileMarkdownSync').mockImplementation(
      () => {
        throw new Error('boom: malformed markdown');
      },
    );

    const component = render(<MarkdownRenderer source="# anything" />);
    const alert = component.getByRole('alert');

    expect(alert).toHaveTextContent('boom: malformed markdown');
    expect(alert).toHaveAttribute('data-testid', 'MarkdownRenderer');
    // The compiled-content container markup must NOT be present on the error
    // path — the whole source degrades to the alert.
    expect(component.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('coerces a non-Error throw into an Error message', () => {
    vi.spyOn(compileMarkdownModule, 'compileMarkdownSync').mockImplementation(
      () => {
        throw 'string failure';
      },
    );

    const component = render(<MarkdownRenderer source="# anything" />);

    expect(component.getByRole('alert')).toHaveTextContent('string failure');
  });
});

describe('MarkdownRenderer Component — components prop', () => {
  test('passes component overrides through MDXProvider to the compiled output', () => {
    const Heading = (
      heading: React.ComponentProps<'h1'>,
    ): React.ReactElement => (
      <h1 data-testid="custom-heading">{heading.children}</h1>
    );

    const component = render(
      <MarkdownRenderer components={{ h1: Heading }} source="# Overridden" />,
    );

    const heading = component.getByTestId('custom-heading');

    expect(heading).toHaveTextContent('Overridden');
    expect(heading.tagName).toBe('H1');
  });
});
