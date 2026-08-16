import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearancePreview } from '../AppearancePreview';
import type { AppearancePreviewProps } from '../AppearancePreview';
import { APPEARANCE_PREVIEW_CHART_CLASSES } from '~/routing/settings/data/data.appearance';

describe('AppearancePreview Component', () => {
  let component: RenderResult;
  let props: AppearancePreviewProps;

  beforeEach(() => {
    props = {};

    component = render(<AppearancePreview {...props} />);
  });

  test('mounts the preview surface', () => {
    expect(component.getByTestId('AppearancePreview')).toBeInTheDocument();
  });

  test('samples the button variants and a badge', () => {
    expect(
      component.getByRole('button', { name: 'Primary' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Outline' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Destructive' }),
    ).toBeInTheDocument();
    expect(component.getByText('Badge')).toBeInTheDocument();
  });

  test('renders one chip per chart token, driven by applied CSS tokens', () => {
    const chips = component
      .getByTestId('AppearancePreviewCharts')
      .querySelectorAll('span');

    expect(chips).toHaveLength(APPEARANCE_PREVIEW_CHART_CLASSES.length);
    for (const chartClass of APPEARANCE_PREVIEW_CHART_CLASSES) {
      expect(
        component
          .getByTestId('AppearancePreviewCharts')
          .querySelector(`.${chartClass}`),
      ).toBeInTheDocument();
    }
  });
});
