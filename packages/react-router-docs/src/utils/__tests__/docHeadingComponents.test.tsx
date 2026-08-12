import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DOC_HEADING_COMPONENTS } from '../docHeadingComponents';

describe('DOC_HEADING_COMPONENTS', () => {
  test('exposes overrides for h2 and h3 only', () => {
    expect(Object.keys(DOC_HEADING_COMPONENTS).sort()).toEqual(['h2', 'h3']);
  });

  test('h2 renders an <h2> with a slug id derived from its text', () => {
    const H2 = DOC_HEADING_COMPONENTS.h2;
    const component = render(<H2>Getting Started</H2>);

    const heading = component.getByRole('heading', {
      level: 2,
      name: /Getting Started/,
    });
    expect(heading.id).toBe('getting-started');
  });

  test('h3 renders an <h3> with a slug id derived from its text', () => {
    const H3 = DOC_HEADING_COMPONENTS.h3;
    const component = render(<H3>Advanced Setup</H3>);

    const heading = component.getByRole('heading', {
      level: 3,
      name: /Advanced Setup/,
    });
    expect(heading.id).toBe('advanced-setup');
  });

  test('renders a copy anchor button when the derived slug is non-empty', () => {
    const H2 = DOC_HEADING_COMPONENTS.h2;
    const component = render(<H2>Some Heading</H2>);

    expect(
      component.getByRole('button', {
        name: 'Copy link to “some-heading” section',
      }),
    ).toBeInTheDocument();
  });

  test('omits the copy anchor when the derived slug is empty', () => {
    const H2 = DOC_HEADING_COMPONENTS.h2;
    const component = render(<H2>!!!</H2>);

    expect(component.queryByRole('button')).not.toBeInTheDocument();
  });

  test('flattens nested children to derive the slug', () => {
    const H2 = DOC_HEADING_COMPONENTS.h2;
    const component = render(
      <H2>
        <code>API</code> Reference
      </H2>,
    );

    const heading = component.getByRole('heading', { level: 2 });
    expect(heading.id).toBe('api-reference');
  });
});
