import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Markdown } from '../Markdown';

describe('Markdown', () => {
  test('renders string content and merges className', () => {
    const { container } = render(
      <Markdown className="custom-md" content="hello world" />,
    );
    const el = container.querySelector('.markdown');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('custom-md');
    expect(el).toHaveTextContent('hello world');
  });

  test('stringifies object content', () => {
    const { container } = render(<Markdown content={{ a: 1 }} />);
    expect(container.querySelector('code')).toHaveTextContent('"a": 1');
  });

  test('forwards its ref to the root element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Markdown content="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
