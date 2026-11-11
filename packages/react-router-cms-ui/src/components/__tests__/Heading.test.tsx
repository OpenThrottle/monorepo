import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { HeadingProps } from '../Heading';
import { Heading } from '../Heading';

const renderHeading = (props: HeadingProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return <Heading {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('Heading Component', () => {
  describe('when given a valid heading tag', () => {
    test('renders the copy at that heading level', async () => {
      const component = renderHeading({ copy: 'Hello', heading: 'h4' });
      const heading = await component.findByRole('heading', { level: 4 });

      expect(heading).toHaveTextContent('Hello');
    });
  });

  describe('when given an invalid heading tag from CMS content', () => {
    test('falls back to an h2', async () => {
      const props = { copy: 'Fallback', heading: 'p' };
      // CMS JSON is untyped at runtime; simulate a bad value without a cast.
      const unsafeProps: HeadingProps = JSON.parse(JSON.stringify(props));
      const component = renderHeading(unsafeProps);

      expect(
        await component.findByRole('heading', { level: 2 }),
      ).toHaveTextContent('Fallback');
    });
  });

  describe('className', () => {
    test('merges the caller className after the base class', async () => {
      const component = renderHeading({
        className: 'text-3xl',
        copy: 'Styled',
        heading: 'h1',
      });

      expect(await component.findByRole('heading', { level: 1 })).toHaveClass(
        'heading',
        'text-3xl',
      );
    });
  });

  test('carries an empty debug overlay', () => {
    expect(Heading.debug.className).toBeUndefined();
  });
});
