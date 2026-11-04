import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import { BlogPostStateBadge } from '../BlogPostStateBadge';

describe('BlogPostStateBadge Component', () => {
  test.each([
    [BlogPostState.Draft, 'Draft'],
    [BlogPostState.Scheduled, 'Scheduled'],
    [BlogPostState.Live, 'Live'],
    [BlogPostState.Archived, 'Archived'],
  ])('labels %s as %s', (state, label) => {
    const component = render(<BlogPostStateBadge state={state} />);

    expect(component.getByTestId('BlogPostStateBadge')).toHaveTextContent(
      label,
    );
  });
});
