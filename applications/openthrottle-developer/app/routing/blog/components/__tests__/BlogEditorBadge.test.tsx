import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { BlogEditorBadge } from '../BlogEditorBadge';

const renderBadge = (lastEditedBy: string | null): RenderResult =>
  render(<BlogEditorBadge lastEditedBy={lastEditedBy} />);

describe('BlogEditorBadge Component', () => {
  test('shows an Agent badge and the account name for a service account', () => {
    const component = renderBadge('openthrottle-mcp');

    expect(component.getByTestId('BlogEditorBadge-agent')).toHaveTextContent(
      'Agent',
    );
    expect(component.getByText('openthrottle-mcp')).toBeInTheDocument();
    expect(component.getByTestId('BlogEditorBadge')).toHaveAttribute(
      'data-agent',
      'true',
    );
  });

  test('shows a person as a plain name with no Agent badge', () => {
    const component = renderBadge('visormatt');

    expect(component.getByText('visormatt')).toBeInTheDocument();
    expect(
      component.queryByTestId('BlogEditorBadge-agent'),
    ).not.toBeInTheDocument();
  });

  test('shows an em dash when no editor was recorded', () => {
    const component = renderBadge(null);

    expect(component.getByTestId('BlogEditorBadge')).toHaveTextContent('—');
  });
});
