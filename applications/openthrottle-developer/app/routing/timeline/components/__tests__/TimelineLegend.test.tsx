import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  TIMELINE_MARKER_KIND_LABEL,
  TIMELINE_MARKER_KINDS,
  TIMELINE_SPAN_KIND_LABEL,
  TIMELINE_SPAN_KINDS,
} from '~/routing/timeline/config/kinds';
import {
  TIMELINE_DISCLOSURE_COPY,
  TIMELINE_LEGEND_COPY,
} from '~/routing/timeline/data/data.copy';
import { markerKindPath } from '~/routing/timeline/utils/marker-glyph-path';
import { TimelineLegend } from '../TimelineLegend';

describe('TimelineLegend Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <TimelineLegend />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the legend', () => {
    expect(component.getByTestId('TimelineLegend')).toBeInTheDocument();
  });

  test('should name every span kind', () => {
    for (const kind of TIMELINE_SPAN_KINDS) {
      expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
        TIMELINE_SPAN_KIND_LABEL[kind],
      );
    }
  });

  test('should name every marker kind', () => {
    for (const kind of TIMELINE_MARKER_KINDS) {
      // Each label appears twice — once as the legend text, once inside the
      // glyph's own <title> — so match on the legend as a whole.
      expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
        TIMELINE_MARKER_KIND_LABEL[kind],
      );
    }
  });

  test('should draw the same glyph shapes the chart draws', () => {
    // Same path function, so the legend cannot describe a shape the chart does
    // not use — the drift the plan explicitly calls out.
    const paths = [...component.container.querySelectorAll('path')].map(
      (node) => node.getAttribute('d'),
    );

    for (const kind of TIMELINE_MARKER_KINDS) {
      expect(paths).toContain(markerKindPath(kind, 4));
    }
  });

  test('should include the derived-end treatment with its explanation', () => {
    expect(component.getByTestId('TimelineLegendDerived')).toBeInTheDocument();
    expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
      TIMELINE_DISCLOSURE_COPY.derivedEnd,
    );
    expect(
      component.getByText(TIMELINE_LEGEND_COPY.derivedLabel),
    ).toBeVisible();
  });

  test('should disclose that the grilling lane is not user-scoped', () => {
    expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
      TIMELINE_DISCLOSURE_COPY.grillingScope,
    );
  });

  test('should disclose that task updates are last-write-only', () => {
    expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
      TIMELINE_DISCLOSURE_COPY.taskUpdated,
    );
  });

  test('should disclose that status changes are recorded inconsistently', () => {
    expect(component.getByTestId('TimelineLegend')).toHaveTextContent(
      TIMELINE_DISCLOSURE_COPY.statusChange,
    );
  });
});
