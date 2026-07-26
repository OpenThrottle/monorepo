import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Toaster, toast } from '../Sonner';

describe('Sonner', () => {
  it('should render Toaster', () => {
    render(<Toaster />);
    expect(
      screen.getByRole('region', { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it('should render with custom position', () => {
    render(<Toaster position="top-right" />);
    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });
});

describe('toast empty-message guard', () => {
  // A created toast returns its id (string | number); a suppressed one returns
  // undefined. Assert on the return value so the test stays deterministic
  // without waiting on Sonner's async render.
  afterEach(() => {
    toast.dismiss();
  });

  it('suppresses empty and whitespace-only string messages', () => {
    expect(toast.success('')).toBeUndefined();
    expect(toast.error('   ')).toBeUndefined();
    expect(toast.info('\n\t')).toBeUndefined();
    expect(toast.warning('')).toBeUndefined();
    expect(toast.message('')).toBeUndefined();
    expect(toast.loading('  ')).toBeUndefined();
    // Base callable is guarded too.
    expect(toast('')).toBeUndefined();
  });

  it('forwards non-empty string messages', () => {
    expect(toast.success('Saved.')).not.toBeUndefined();
    expect(toast.error('Boom.')).not.toBeUndefined();
    expect(toast(' non-blank ')).not.toBeUndefined();
  });

  it('passes ReactNode messages through untouched', () => {
    expect(toast.success(<span>Rich content</span>)).not.toBeUndefined();
  });

  it('preserves the non-message methods', () => {
    expect(typeof toast.promise).toBe('function');
    expect(typeof toast.custom).toBe('function');
    expect(typeof toast.dismiss).toBe('function');
    expect(typeof toast.getToasts).toBe('function');
  });
});
