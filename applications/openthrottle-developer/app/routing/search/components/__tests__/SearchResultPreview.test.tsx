import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';

import type { SearchResultPreviewProps } from '../SearchResultPreview';
import { SearchResultPreview } from '../SearchResultPreview';

function chunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Full body of the result',
    id: 'chunk-1',
    planId: 'plan-1',
    planTitle: 'My Plan',
    similarity: 0.8,
    source: 'plan',
    sourcePath: null,
    sourceRepo: null,
    sourceSha: null,
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

function renderPreview(
  overrides: Partial<SearchResultPreviewProps> = {},
): RenderResult {
  const props: SearchResultPreviewProps = {
    defaultOpenWhy: false,
    onClose: vi.fn(),
    rankMeta: undefined,
    result: chunk(),
    returnFocusTo: null,
    ...overrides,
  };
  const Component = (): React.ReactElement => {
    return <SearchResultPreview {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
}

describe('SearchResultPreview', () => {
  test('renders nothing while no result is selected', () => {
    const component = renderPreview({ result: null });

    expect(component.queryByTestId('SearchResultPreview')).toBeNull();
  });

  test('shows the full content, ranking details and the open action', () => {
    const component = renderPreview();

    expect(
      component.getByTestId('SearchResultPreview-content'),
    ).toHaveTextContent('Full body of the result');
    expect(component.getByTestId('SearchWhyThisResult')).toBeInTheDocument();
    expect(component.getByTestId('SearchResultPreview-open')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('opens documentation results on GitHub in a new tab', () => {
    const component = renderPreview({
      result: chunk({
        planId: null,
        source: 'documentation',
        sourcePath: 'docs/a.md',
        sourceRepo: 'o/r',
      }),
    });
    const open = component.getByTestId('SearchResultPreview-open');

    expect(open).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/main/docs/a.md',
    );
    expect(open).toHaveAttribute('target', '_blank');
  });

  test('omits the open action when the result has nowhere to go', () => {
    const component = renderPreview({ result: chunk({ planId: null }) });

    expect(component.queryByTestId('SearchResultPreview-open')).toBeNull();
  });

  test('expands ranking details by default in power-user mode', () => {
    const component = renderPreview({ defaultOpenWhy: true });

    expect(component.getByTestId('SearchWhyThisResult')).toHaveAttribute(
      'open',
    );
  });

  test('Escape closes the preview', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderPreview({ onClose });
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
