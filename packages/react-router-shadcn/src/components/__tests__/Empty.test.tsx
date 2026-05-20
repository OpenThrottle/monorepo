import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../Empty';

describe('Empty', () => {
  it('should render with default props', () => {
    const { container } = render(
      <Empty>
        <EmptyHeader />
      </Empty>,
    );
    const empty = container.querySelector('[data-slot="empty"]');
    expect(empty).toBeInTheDocument();
  });

  it('should apply default empty classes', () => {
    const { container } = render(<Empty />);
    const empty = container.querySelector('[data-slot="empty"]');
    expect(empty).toHaveClass(
      'flex',
      'min-w-0',
      'flex-1',
      'flex-col',
      'items-center',
      'justify-center',
      'gap-6',
      'rounded-lg',
      'border-dashed',
      'p-6',
      'text-center',
      'text-balance',
      'md:p-12',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Empty className="custom-class" />);
    const empty = container.querySelector('[data-slot="empty"]');
    expect(empty).toHaveClass('custom-class');
  });
});

describe('EmptyHeader', () => {
  it('should render and apply header classes', () => {
    const { container } = render(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Title</EmptyTitle>
        </EmptyHeader>
      </Empty>,
    );
    const header = container.querySelector('[data-slot="empty-header"]');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('Title');
    expect(header).toHaveClass(
      'flex',
      'max-w-sm',
      'flex-col',
      'items-center',
      'gap-2',
      'text-center',
    );
  });
});

describe('EmptyMedia', () => {
  it('should render with default variant', () => {
    const { container } = render(
      <EmptyMedia>
        <span>Media</span>
      </EmptyMedia>,
    );
    const media = container.querySelector('[data-slot="empty-icon"]');
    expect(media).toBeInTheDocument();
    expect(media).toHaveAttribute('data-variant', 'default');
    expect(media).toHaveTextContent('Media');
  });

  it('should apply icon variant classes', () => {
    const { container } = render(
      <EmptyMedia variant="icon">
        <span>Icon</span>
      </EmptyMedia>,
    );
    const media = container.querySelector('[data-slot="empty-icon"]');
    expect(media).toHaveAttribute('data-variant', 'icon');
    expect(media).toHaveClass(
      'flex',
      'size-10',
      'items-center',
      'justify-center',
      'rounded-lg',
      'bg-muted',
      'text-foreground',
    );
  });
});

describe('EmptyTitle', () => {
  it('should render title', () => {
    const { container } = render(<EmptyTitle>No data</EmptyTitle>);
    const title = container.querySelector('[data-slot="empty-title"]');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('No data');
    expect(title).toHaveClass('text-lg', 'font-medium', 'tracking-tight');
  });
});

describe('EmptyDescription', () => {
  it('should render description', () => {
    const { container } = render(
      <EmptyDescription>No data found</EmptyDescription>,
    );
    const desc = container.querySelector('[data-slot="empty-description"]');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveTextContent('No data found');
    expect(desc).toHaveClass('text-sm/relaxed', 'text-muted-foreground');
  });
});

describe('EmptyContent', () => {
  it('should render content', () => {
    const { container } = render(
      <EmptyContent>
        <button type="button">Add data</button>
      </EmptyContent>,
    );
    const content = container.querySelector('[data-slot="empty-content"]');
    expect(content).toBeInTheDocument();
    const button = content?.querySelector('button');
    expect(button).toHaveTextContent('Add data');
  });
});
