import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TimelineMarkerKind } from '~/__generated__/graphql';
import { TIMELINE_MARKER_KIND_LABEL } from '~/routing/timeline/config/kinds';
import { TimelineMarkerGlyph } from '../TimelineMarkerGlyph';
import type { TimelineMarkerGlyphProps } from '../TimelineMarkerGlyph';

const renderGlyph = (props: TimelineMarkerGlyphProps): RenderResult => {
  const Component = () => (
    <svg>
      <TimelineMarkerGlyph {...props} />
    </svg>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineMarkerGlyph Component', () => {
  test('should render the glyph', () => {
    const view = renderGlyph({
      kind: TimelineMarkerKind.TaskAdded,
      radius: 5,
    });

    expect(
      within(view.container).getByTestId('TimelineMarkerGlyph'),
    ).toBeInTheDocument();
  });

  test('should translate to the requested position', () => {
    const view = renderGlyph({
      kind: TimelineMarkerKind.GitCommit,
      radius: 5,
      x: 120,
      y: 40,
    });

    expect(
      within(view.container).getByTestId('TimelineMarkerGlyph'),
    ).toHaveAttribute('transform', 'translate(120, 40)');
  });

  test('should not show a count badge for a single marker', () => {
    const view = renderGlyph({
      count: 1,
      kind: TimelineMarkerKind.GitCommit,
      radius: 5,
    });

    expect(
      within(view.container).queryByTestId('TimelineMarkerGlyphCount'),
    ).toBeNull();
  });

  test('should show a count badge for a cluster', () => {
    const view = renderGlyph({
      count: 7,
      kind: TimelineMarkerKind.GitCommit,
      radius: 5,
    });

    expect(
      within(view.container).getByTestId('TimelineMarkerGlyphCount'),
    ).toHaveTextContent('7');
  });

  test('should keep its kind shape when clustered rather than becoming a dot', () => {
    const single = renderGlyph({
      count: 1,
      kind: TimelineMarkerKind.Grilling,
      radius: 5,
    });
    const clustered = renderGlyph({
      count: 4,
      kind: TimelineMarkerKind.Grilling,
      radius: 5,
    });

    const singlePath = single.container
      .querySelector('path')
      ?.getAttribute('d');
    const clusteredPath = clustered.container
      .querySelector('path')
      ?.getAttribute('d');

    expect(clusteredPath).toBe(singlePath);
  });

  test('should name the kind in its title, and the count when clustered', () => {
    const view = renderGlyph({
      count: 3,
      kind: TimelineMarkerKind.Grilling,
      radius: 5,
    });

    expect(view.container).toHaveTextContent(
      `3 × ${TIMELINE_MARKER_KIND_LABEL[TimelineMarkerKind.Grilling]}`,
    );
  });
});
