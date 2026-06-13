import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from '../ScrollArea';

describe('ScrollArea', () => {
  it('should render root and viewport', () => {
    const { container } = render(<ScrollArea />);
    expect(
      container.querySelector('[data-slot="scroll-area"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]'),
    ).toBeInTheDocument();
  });

  it('should render children inside the viewport', () => {
    const { container } = render(
      <ScrollArea>
        <div data-testid="content">Scrollable content</div>
      </ScrollArea>,
    );
    const viewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    expect(
      viewport?.querySelector('[data-testid="content"]'),
    ).toHaveTextContent('Scrollable content');
  });

  it('should merge custom className on the root', () => {
    const { container } = render(<ScrollArea className="custom-class" />);
    const root = container.querySelector('[data-slot="scroll-area"]');
    expect(root).toHaveClass('relative', 'custom-class');
  });

  it('should forward ref to the root element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ScrollArea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
