import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import type { GlobalFooterProps } from '../GlobalFooter';
import { GlobalFooter } from '../GlobalFooter';

const renderFooter = (props: GlobalFooterProps = {}): void => {
  const Component = () => <GlobalFooter {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  render(<RoutesStub />);
};

/**
 * @description Each per-component status dot is a className-only `<div>` (no
 * text/role) rendered next to its label (e.g. `<dot> &nbsp;API`). Find the
 * label text, walk up to the wrapping `<div>`, and grab the dot inside it.
 */
const getComponentDot = (label: RegExp): Element => {
  const wrapper = screen.getByText(label).closest('div');
  const dot = wrapper?.querySelector('div.rounded-full');
  if (dot == null) {
    throw new Error(`Expected a status dot next to ${String(label)}`);
  }
  return dot;
};

const okHealth: ServerHealthObject = {
  api: 'ok',
  database: 'ok',
  redis: 'ok',
  websocket: 'ok',
};

describe('GlobalFooter Component', () => {
  test('renders footer tagline and health status link', () => {
    renderFooter();

    expect(screen.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      screen.getByText(/Built by engineers.*Open source.*Run locally/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('/health'),
    );
    expect(screen.getByText(/API/i)).toBeInTheDocument();
    expect(screen.getByText(/Postgres/i)).toBeInTheDocument();
    expect(screen.getByText(/Redis/i)).toBeInTheDocument();
    expect(screen.getByText(/Sockets/i)).toBeInTheDocument();
  });

  describe('per-component status dot color mapping', () => {
    test('maps ok → green for every reported component', () => {
      renderFooter({ health: okHealth });

      expect(getComponentDot(/API/i)).toHaveClass('bg-green-500');
      expect(getComponentDot(/Postgres/i)).toHaveClass('bg-green-500');
      expect(getComponentDot(/Redis/i)).toHaveClass('bg-green-500');
    });

    test('maps unreachable → red', () => {
      renderFooter({ health: { ...okHealth, redis: 'unreachable' } });

      const redisDot = getComponentDot(/Redis/i);
      expect(redisDot).toHaveClass('bg-red-500');
      expect(redisDot).not.toHaveClass('bg-green-500');
    });

    test('maps unconfigured → amber', () => {
      renderFooter({ health: { ...okHealth, database: 'unconfigured' } });

      const dbDot = getComponentDot(/Postgres/i);
      expect(dbDot).toHaveClass('bg-amber-500');
      expect(dbDot).not.toHaveClass('bg-green-500');
    });

    test('maps an unknown/empty value → amber (not green)', () => {
      renderFooter({ health: { ...okHealth, api: 'something-unexpected' } });

      const apiDot = getComponentDot(/API/i);
      expect(apiDot).toHaveClass('bg-amber-500');
      expect(apiDot).not.toHaveClass('bg-green-500');
    });

    test('defaults to amber when no health payload is present', () => {
      renderFooter();

      expect(getComponentDot(/API/i)).toHaveClass('bg-amber-500');
      expect(getComponentDot(/Postgres/i)).toHaveClass('bg-amber-500');
      expect(getComponentDot(/Redis/i)).toHaveClass('bg-amber-500');
    });
  });
});
