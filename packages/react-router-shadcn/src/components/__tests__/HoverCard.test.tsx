import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../HoverCard';

describe('HoverCard', () => {
  it('should render HoverCard root', () => {
    const { container } = render(<HoverCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render HoverCardTrigger as button', () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
      </HoverCard>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Hover');
  });

  it('should render HoverCardContent with expected content', () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>Card content</HoverCardContent>
      </HoverCard>,
    );
    expect(container.textContent).toContain('Hover');
    expect(container.textContent).toContain('Card content');
  });
});
