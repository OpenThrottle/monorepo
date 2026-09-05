import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { SearchParamsProbe } from '~/testing/SearchParamsProbe';
import { describe, expect, test } from 'vitest';
import {
  TIMELINE_MARKER_KIND_LABEL,
  TIMELINE_MARKER_KINDS,
  TIMELINE_SPAN_KIND_LABEL,
  TIMELINE_SPAN_KINDS,
} from '~/routing/timeline/config/kinds';
import { TimelineKindToggles } from '../TimelineKindToggles';
import type { TimelineKindTogglesProps } from '../TimelineKindToggles';

const renderToggles = (
  overrides: Partial<TimelineKindTogglesProps> = {},
): void => {
  const props: TimelineKindTogglesProps = {
    selectedMarkerKinds: null,
    selectedSpanKinds: null,
    ...overrides,
  };
  const Component = () => (
    <>
      <TimelineKindToggles {...props} />
      <SearchParamsProbe />
    </>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/timeline' }]);

  render(<RoutesStub initialEntries={['/timeline']} />);
};

describe('TimelineKindToggles Component', () => {
  test('should render a toggle for every span and marker kind', () => {
    renderToggles();

    expect(screen.getAllByRole('button')).toHaveLength(
      TIMELINE_SPAN_KINDS.length + TIMELINE_MARKER_KINDS.length,
    );
  });

  test('should narrow the server query rather than only hiding DOM', async () => {
    // The allowlist goes into the URL, which the loader reads and passes to
    // the query's `kinds` filter — unchecking a kind stops it being fetched.
    const user = userEvent.setup();
    renderToggles();

    await user.click(
      screen.getByRole('button', { name: TIMELINE_SPAN_KIND_LABEL.PLAN_RUN }),
    );

    const search = screen.getByTestId('search').textContent ?? '';
    expect(search).toContain('spans=');
    expect(search).not.toContain('PLAN_RUN');
  });

  test('should press every toggle when nothing is filtered', () => {
    renderToggles();

    for (const kind of TIMELINE_SPAN_KINDS) {
      expect(
        screen.getByRole('button', { name: TIMELINE_SPAN_KIND_LABEL[kind] }),
      ).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('should reflect a partial span selection', () => {
    renderToggles({ selectedSpanKinds: ['PLAN_RUN'] });

    expect(
      screen.getByRole('button', { name: TIMELINE_SPAN_KIND_LABEL.PLAN_RUN }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {
        name: TIMELINE_SPAN_KIND_LABEL.WORK_SESSION,
      }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('should reflect an empty selection as every toggle unpressed', () => {
    renderToggles({ selectedMarkerKinds: [] });

    for (const kind of TIMELINE_MARKER_KINDS) {
      expect(
        screen.getByRole('button', { name: TIMELINE_MARKER_KIND_LABEL[kind] }),
      ).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('should write an empty allowlist when the last kind is unchecked', async () => {
    const user = userEvent.setup();
    renderToggles({ selectedSpanKinds: ['PLAN_RUN'] });

    await user.click(
      screen.getByRole('button', { name: TIMELINE_SPAN_KIND_LABEL.PLAN_RUN }),
    );

    // "None" has to be distinguishable from "unset", or unchecking everything
    // would silently revert to showing everything.
    expect(screen.getByTestId('search')).toHaveTextContent('spans=');
  });
});
