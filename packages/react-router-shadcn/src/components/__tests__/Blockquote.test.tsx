import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Blockquote } from '../Blockquote';

describe('Blockquote', () => {
  it('should render as a blockquote with content', () => {
    const { container } = render(
      <Blockquote>A plans knowledge base.</Blockquote>,
    );
    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent('A plans knowledge base.');
  });

  it('should apply default typography classes', () => {
    const { container } = render(<Blockquote>Quote</Blockquote>);
    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toHaveClass('border-l-2', 'pl-6', 'italic');
  });

  it('should merge custom className', () => {
    const { container } = render(
      <Blockquote className="custom-class">Quote</Blockquote>,
    );
    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLQuoteElement>();
    render(<Blockquote ref={ref}>Quote</Blockquote>);
    expect(ref.current).toBeInstanceOf(HTMLQuoteElement);
  });
});
