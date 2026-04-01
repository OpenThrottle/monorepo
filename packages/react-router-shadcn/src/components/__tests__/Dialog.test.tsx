import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../Dialog';

describe('Dialog', () => {
  it('should render root with role dialog', () => {
    const { container } = render(<Dialog />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
  });

  it('should render DialogContent with expected classes', () => {
    const { container } = render(
      <Dialog>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );
    const content = container.querySelector('.relative.z-50');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Content');
  });

  it('should render DialogHeader, DialogTitle, DialogDescription', () => {
    const { container } = render(
      <Dialog>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
      </Dialog>,
    );
    expect(container.querySelector('h2')).toHaveTextContent('Title');
    expect(container.querySelector('p')).toHaveTextContent('Description');
  });

  it('should render DialogFooter', () => {
    const { container } = render(
      <Dialog>
        <DialogFooter>Footer</DialogFooter>
      </Dialog>,
    );
    expect(container.textContent).toContain('Footer');
  });

  it('should render DialogTrigger as button', () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Open');
  });
});
