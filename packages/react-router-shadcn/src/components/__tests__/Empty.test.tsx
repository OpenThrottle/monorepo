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
    const empty = container.querySelector('div');
    expect(empty).toBeInTheDocument();
  });

  it('should apply default empty classes', () => {
    const { container } = render(<Empty />);
    const empty = container.querySelector('div');
    expect(empty).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'gap-4',
      'rounded-lg',
      'border',
      'border-dashed',
      'p-8',
      'text-center',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Empty className="custom-class" />);
    const empty = container.querySelector('div');
    expect(empty).toHaveClass('custom-class');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Empty ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
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
    const header = container.querySelector('.flex.flex-col.items-center.gap-2');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('Title');
  });
});

describe('EmptyMedia', () => {
  it('should render with default variant', () => {
    const { container } = render(
      <EmptyMedia>
        <span>Media</span>
      </EmptyMedia>,
    );
    const media = container.querySelector('div');
    expect(media).toBeInTheDocument();
    expect(media).toHaveTextContent('Media');
  });

  it('should apply icon variant classes', () => {
    const { container } = render(
      <EmptyMedia variant="icon">
        <span>Icon</span>
      </EmptyMedia>,
    );
    const media = container.querySelector('div');
    expect(media).toHaveClass(
      'rounded-full',
      'bg-muted',
      'p-3',
      'text-muted-foreground',
    );
  });
});

describe('EmptyTitle', () => {
  it('should render title', () => {
    const { container } = render(<EmptyTitle>No data</EmptyTitle>);
    const title = container.querySelector('h3');
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('No data');
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });
});

describe('EmptyDescription', () => {
  it('should render description', () => {
    const { container } = render(
      <EmptyDescription>No data found</EmptyDescription>,
    );
    const desc = container.querySelector('p');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveTextContent('No data found');
    expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
  });
});

describe('EmptyContent', () => {
  it('should render content', () => {
    const { container } = render(
      <EmptyContent>
        <button type="button">Add data</button>
      </EmptyContent>,
    );
    const content = container.querySelector('div');
    expect(content).toBeInTheDocument();
    const button = content?.querySelector('button');
    expect(button).toHaveTextContent('Add data');
  });
});
