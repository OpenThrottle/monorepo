import type { RenderResult } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';

import {
  MOCK_AGENT_DRAFT,
  MOCK_HUMAN_DRAFT,
  MOCK_SCHEDULED_POST,
} from '../../data/mock.blog-posts';
import type { BlogPostRowProps } from '../BlogPostRow';
import { BlogPostRow } from '../BlogPostRow';

const renderRow = (props: BlogPostRowProps): RenderResult =>
  renderRoutesStub(
    <table>
      <tbody>
        <BlogPostRow {...props} />
      </tbody>
    </table>,
  );

describe('BlogPostRow Component', () => {
  test('shows title, slug, state, author and editor, linking to the post', () => {
    const component = renderRow({ post: MOCK_HUMAN_DRAFT, timeZone: 'UTC' });

    expect(
      component.getByRole('link', { name: 'A hand-written draft' }),
    ).toHaveAttribute('href', '/blog/post-human');
    expect(component.getByText('hand-written-draft')).toBeInTheDocument();
    expect(component.getByTestId('BlogPostStateBadge')).toHaveTextContent(
      'Draft',
    );
    expect(component.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(component.getByText('visormatt')).toBeInTheDocument();
    expect(
      component.getByText('Oct 20, 2026, 3:30 PM UTC'),
    ).toBeInTheDocument();
  });

  test('does not mark a person-edited row as an agent edit', () => {
    const component = renderRow({ post: MOCK_HUMAN_DRAFT, timeZone: 'UTC' });

    expect(component.getByTestId('BlogPostRow')).toHaveAttribute(
      'data-agent-edit',
      'false',
    );
    expect(
      component.queryByTestId('BlogEditorBadge-agent'),
    ).not.toBeInTheDocument();
  });

  test('marks an agent-edited row and shows the Agent badge', () => {
    const component = renderRow({ post: MOCK_AGENT_DRAFT, timeZone: 'UTC' });

    expect(component.getByTestId('BlogPostRow')).toHaveAttribute(
      'data-agent-edit',
      'true',
    );
    expect(component.getByTestId('BlogEditorBadge-agent')).toHaveTextContent(
      'Agent',
    );
  });

  test('says when a scheduled post goes live, with the time zone', () => {
    const component = renderRow({
      post: MOCK_SCHEDULED_POST,
      timeZone: 'America/Los_Angeles',
    });

    expect(
      component.getByText('goes live Nov 1, 2026, 9:00 AM PST'),
    ).toBeInTheDocument();
  });
});
