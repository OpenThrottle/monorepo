import { Image, Layout, Link } from '@openthrottle/react-router-cms-ui';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { BLOCK_SAMPLES } from '../../data/data.blocks';
import { BLOCKS_COPY } from '../../data/data.copy';
import { BlocksPreview } from '../BlocksPreview';

const getLayout = (component: RenderResult): HTMLElement | null => {
  const [nested] = component
    .getAllByRole('heading', {
      name: BLOCK_SAMPLES.card.heading,
    })
    .slice(-1);

  return nested?.closest(`.${Layout.debug.className}`) ?? null;
};

describe('BlocksPreview Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => {
      return <BlocksPreview className={undefined} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a labelled section for every block', () => {
    const labels = Object.values(BLOCKS_COPY.sections);

    labels.forEach((label) => {
      expect(
        component.getByRole('region', { name: label }),
      ).toBeInTheDocument();
    });
  });

  test('renders the blocks with their sample props', () => {
    expect(
      component.getByRole('heading', { level: 1, name: /A custom CMS/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: BLOCK_SAMPLES.link.cta }),
    ).toHaveAttribute('href', BLOCK_SAMPLES.link.to);
    expect(component.getByTestId('Wysiwyg').querySelector('ul')).not.toBeNull();
    expect(component.getAllByRole('group')).toHaveLength(
      BLOCK_SAMPLES.carousel.images.length,
    );
  });

  describe('when debug mode is off', () => {
    test('does not apply any debug class names', () => {
      const image = component.getByAltText(BLOCK_SAMPLES.image.alt);

      expect(component.getByRole('switch')).not.toBeChecked();
      expect(image.parentElement).not.toHaveClass(`${Image.debug.className}`);
      expect(getLayout(component)).toBeNull();
    });
  });

  describe('when debug mode is on', () => {
    beforeEach(async () => {
      await userEvent.click(
        component.getByRole('switch', { name: BLOCKS_COPY.debugLabel }),
      );
    });

    test('merges each block debug class name', () => {
      const image = component.getByAltText(BLOCK_SAMPLES.image.alt);
      const link = component.getByRole('link', {
        name: BLOCK_SAMPLES.link.cta,
      });

      expect(component.getByRole('switch')).toBeChecked();
      expect(image.parentElement).toHaveClass(`${Image.debug.className}`);
      expect(link).toHaveClass(`${Link.debug.className}`);
      expect(getLayout(component)).not.toBeNull();
    });
  });
});
