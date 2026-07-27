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

  it('suppresses nullish and non-ReactNode messages', () => {
    // The nullish/undefined vector that a plain string guard cannot see.
    expect(toast.error(undefined)).toBeUndefined();
    expect(toast.success(null)).toBeUndefined();
    expect(toast.info(undefined)).toBeUndefined();
    // A boolean renders nothing in React, so it must be suppressed too.
    expect(toast.warning(false)).toBeUndefined();
    // Base callable is guarded for nullish too.
    expect(toast(undefined)).toBeUndefined();
    expect(toast(null)).toBeUndefined();
  });

  it('forwards non-empty string messages', () => {
    expect(toast.success('Saved.')).not.toBeUndefined();
    expect(toast.error('Boom.')).not.toBeUndefined();
    expect(toast(' non-blank ')).not.toBeUndefined();
  });

  it('passes ReactNode messages through untouched', () => {
    expect(toast.success(<span>Rich content</span>)).not.toBeUndefined();
    expect(toast.info(<>Fragment content</>)).not.toBeUndefined();
  });

  it('preserves the non-message methods', () => {
    expect(typeof toast.promise).toBe('function');
    expect(typeof toast.custom).toBe('function');
    expect(typeof toast.dismiss).toBe('function');
    expect(typeof toast.getToasts).toBe('function');
  });
});

describe('toast per-type color classNames', () => {
  // The Toaster wires per-type surface colors via Sonner's
  // `toastOptions.classNames`; Sonner applies each key only to toasts of that
  // `data-type`. Assert the rendered toast element carries the mapped hue
  // classes (status types) and that transient types stay neutral. The classes
  // use Tailwind's trailing-`!` important — see the Sonner component for why.
  afterEach(() => {
    toast.dismiss();
  });

  const toastElementFor = async (message: string): Promise<Element> => {
    const body = await screen.findByText(message);
    const el = body.closest('[data-sonner-toast]');
    if (!el) {
      throw new Error(`No [data-sonner-toast] ancestor for "${message}"`);
    }
    return el;
  };

  it('applies the red hue to error toasts', async () => {
    render(<Toaster />);
    toast.error('error toast');
    expect(await toastElementFor('error toast')).toHaveClass(
      'border-red-500/50!',
      'bg-red-500/20!',
    );
  });

  it('applies the amber hue to warning toasts', async () => {
    render(<Toaster />);
    toast.warning('warning toast');
    expect(await toastElementFor('warning toast')).toHaveClass(
      'border-amber-500/50!',
      'bg-amber-500/20!',
    );
  });

  it('applies the green hue to success toasts', async () => {
    render(<Toaster />);
    toast.success('success toast');
    expect(await toastElementFor('success toast')).toHaveClass(
      'border-green-500/50!',
      'bg-green-500/20!',
    );
  });

  it('applies the sky hue to info toasts', async () => {
    render(<Toaster />);
    toast.info('info toast');
    expect(await toastElementFor('info toast')).toHaveClass(
      'border-sky-500/50!',
      'bg-sky-500/20!',
    );
  });

  it('leaves loading and message toasts neutral', async () => {
    render(<Toaster />);
    toast.loading('loading toast');
    toast.message('message toast');
    const hueSurface = /(?:bg|border)-(?:red|amber|green|sky)-500\/(?:20|50)!/;
    expect((await toastElementFor('loading toast')).className).not.toMatch(
      hueSurface,
    );
    expect((await toastElementFor('message toast')).className).not.toMatch(
      hueSurface,
    );
  });
});
