import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { CardProps } from '../Card';
import { Card } from '../Card';

const renderCard = (props: CardProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return <Card {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('Card Component', () => {
  describe('with a known icon', () => {
    test('renders the heading, copy and that icon', async () => {
      const component = renderCard({
        copy: 'This is a sample card component.',
        heading: "Don't mess with Texas",
        icon: 'Rocket',
      });

      expect(
        await component.findByRole('heading', { level: 3 }),
      ).toHaveTextContent("Don't mess with Texas");
      expect(
        component.getByText('This is a sample card component.'),
      ).toBeInTheDocument();
      expect(component.getByTestId('CardIcon')).toHaveClass('lucide-rocket');
    });
  });

  describe('with an unknown icon from CMS content', () => {
    test('falls back to the warning icon', async () => {
      const props = { copy: 'Copy', heading: 'Heading', icon: 'Banana' };
      // CMS JSON is untyped at runtime; simulate a bad value without a cast.
      const unsafeProps: CardProps = JSON.parse(JSON.stringify(props));
      const component = renderCard(unsafeProps);

      expect(await component.findByTestId('CardIcon')).toHaveClass(
        'lucide-triangle-alert',
      );
    });
  });

  describe('className', () => {
    test('merges the caller className onto the card', async () => {
      const component = renderCard({
        className: 'max-w-sm',
        copy: 'Copy',
        heading: 'Heading',
        icon: 'Sun',
      });
      const heading = await component.findByRole('heading', { level: 3 });

      expect(heading.closest('[data-slot="card"]')).toHaveClass('max-w-sm');
    });
  });
});
