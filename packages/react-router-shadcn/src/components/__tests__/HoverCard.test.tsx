import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../HoverCard';

describe('HoverCard', () => {
  it('should render HoverCard root with children', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
      </HoverCard>,
    );
    expect(screen.getByText('Hover')).toBeInTheDocument();
  });

  it('should render HoverCardTrigger as a link (Radix uses Primitive.a)', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover</HoverCardTrigger>
      </HoverCard>,
    );
    const trigger = screen.getByText('Hover').closest('a');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Hover');
  });

  it('should render HoverCardContent with expected content when open', () => {
    render(
      <HoverCard onOpenChange={() => {}} open={true}>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>Card content</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.getByText('Hover')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });
});
