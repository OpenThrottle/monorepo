import type { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { GlobalFooterProps } from '../GlobalFooter';
import { GlobalFooter } from '../GlobalFooter';

const renderFooter = (props: GlobalFooterProps = {}): RenderResult => {
  const Component = () => {
    return <GlobalFooter {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

/**
 * @description Each per-component status dot is a className-only `<div>` (no
 * text/role) rendered next to its label (e.g. `<dot> &nbsp;API`). Find the
 * label text, walk up to the wrapping `<div>`, and grab the dot inside it.
 */
const getComponentDot = (component: RenderResult, label: RegExp): Element => {
  const wrapper = component.getByText(label).closest('div');
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
    const component = renderFooter();

    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      component.getByText(/Built by engineers.*Open source.*Run locally/i),
    ).toBeInTheDocument();
    expect(component.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('/health'),
    );
    expect(component.getByText(/API/i)).toBeInTheDocument();
    expect(component.getByText(/Postgres/i)).toBeInTheDocument();
    expect(component.getByText(/Redis/i)).toBeInTheDocument();
    expect(component.queryByText(/Sockets/i)).not.toBeInTheDocument();
  });

  describe('per-component status dot color mapping', () => {
    test('maps ok → green for every reported component', () => {
      const component = renderFooter({ health: okHealth });

      expect(getComponentDot(component, /API/i)).toHaveClass('bg-green-500');
      expect(getComponentDot(component, /Postgres/i)).toHaveClass(
        'bg-green-500',
      );
      expect(getComponentDot(component, /Redis/i)).toHaveClass('bg-green-500');
    });

    test('maps unreachable → red', () => {
      const component = renderFooter({
        health: { ...okHealth, redis: 'unreachable' },
      });

      const redisDot = getComponentDot(component, /Redis/i);
      expect(redisDot).toHaveClass('bg-red-500');
      expect(redisDot).not.toHaveClass('bg-green-500');
    });

    test('maps unconfigured → amber', () => {
      const component = renderFooter({
        health: { ...okHealth, database: 'unconfigured' },
      });

      const dbDot = getComponentDot(component, /Postgres/i);
      expect(dbDot).toHaveClass('bg-amber-500');
      expect(dbDot).not.toHaveClass('bg-green-500');
    });

    test('maps an unknown/empty value → amber (not green)', () => {
      const component = renderFooter({
        health: { ...okHealth, api: 'something-unexpected' },
      });

      const apiDot = getComponentDot(component, /API/i);
      expect(apiDot).toHaveClass('bg-amber-500');
      expect(apiDot).not.toHaveClass('bg-green-500');
    });

    test('defaults to amber when no health payload is present', () => {
      const component = renderFooter();

      expect(getComponentDot(component, /API/i)).toHaveClass('bg-amber-500');
      expect(getComponentDot(component, /Postgres/i)).toHaveClass(
        'bg-amber-500',
      );
      expect(getComponentDot(component, /Redis/i)).toHaveClass('bg-amber-500');
    });
  });
});
