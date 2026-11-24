import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { TimelineLaneGrouping } from '~/__generated__/graphql';
import {
  TIMELINE_GROUPING_LABELS,
  TIMELINE_WINDOW_LABELS,
} from '~/routing/timeline/data/data.copy';
import { SearchParamsProbe } from '~/testing/SearchParamsProbe';

import type { TimelineControlsProps } from '../TimelineControls';
import { TimelineControls } from '../TimelineControls';

const baseProps = (
  overrides: Partial<TimelineControlsProps> = {},
): TimelineControlsProps => {
  return {
    grouping: TimelineLaneGrouping.ByPlan,
    selectedMarkerKinds: null,
    selectedSpanKinds: null,
    windowFromIso: '2026-09-01T00:00:00.000Z',
    windowPreset: '7d',
    windowToIso: '2026-09-08T00:00:00.000Z',
    ...overrides,
  };
};

/** Renders at `path`, so the stub router has search params to read and write. */
const renderControls = (
  props: TimelineControlsProps,
  initialEntry = '/timeline',
): RenderResult => {
  const Component = () => {
    return (
      <>
        <TimelineControls {...props} />
        <SearchParamsProbe />
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/timeline' }]);

  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('TimelineControls Component', () => {
  test('should render the controls row', () => {
    const component = renderControls(baseProps());

    expect(component.getByTestId('TimelineControls')).toBeInTheDocument();
  });

  test('should offer every window preset', () => {
    const component = renderControls(baseProps());

    for (const label of Object.values(TIMELINE_WINDOW_LABELS)) {
      expect(component.getByRole('radio', { name: label })).toBeInTheDocument();
    }
  });

  test('should mark the active window preset as selected', () => {
    const component = renderControls(baseProps({ windowPreset: '30d' }));

    expect(
      component.getByRole('radio', { name: TIMELINE_WINDOW_LABELS['30d'] }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('should offer every lane grouping', () => {
    const component = renderControls(baseProps());

    for (const label of Object.values(TIMELINE_GROUPING_LABELS)) {
      expect(component.getByRole('radio', { name: label })).toBeInTheDocument();
    }
  });

  test('should mark the active grouping as selected', () => {
    const component = renderControls(
      baseProps({ grouping: TimelineLaneGrouping.ByDriver }),
    );

    expect(
      component.getByRole('radio', {
        name: TIMELINE_GROUPING_LABELS.BY_DRIVER,
      }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('should render the resolved range in the viewer time zone', () => {
    const component = renderControls(baseProps());

    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(component.getByTestId('TimelineControlsRange')).toHaveTextContent(
      zone,
    );
  });

  test('should render the kind toggles', () => {
    const component = renderControls(baseProps());

    expect(component.getByTestId('TimelineKindToggles')).toBeInTheDocument();
  });

  test('should write the chosen window to the URL', async () => {
    // The selected value comes from the loader, so what a click actually does
    // is rewrite the search param — that, not local state, is the contract.
    const user = userEvent.setup();
    const component = renderControls(baseProps());

    await user.click(
      component.getByRole('radio', { name: TIMELINE_WINDOW_LABELS['24h'] }),
    );

    expect(component.getByTestId('search')).toHaveTextContent('window=24h');
  });

  test('should drop the window param when the default is chosen again', async () => {
    const user = userEvent.setup();
    const component = renderControls(
      baseProps({ windowPreset: '30d' }),
      '/timeline?window=30d',
    );

    await user.click(
      component.getByRole('radio', { name: TIMELINE_WINDOW_LABELS['7d'] }),
    );

    expect(component.getByTestId('search')).toHaveTextContent('');
  });

  test('should write the chosen grouping to the URL', async () => {
    const user = userEvent.setup();
    const component = renderControls(baseProps());

    await user.click(
      component.getByRole('radio', {
        name: TIMELINE_GROUPING_LABELS.BY_CHECKOUT,
      }),
    );

    expect(component.getByTestId('search')).toHaveTextContent(
      'grouping=BY_CHECKOUT',
    );
  });
});
