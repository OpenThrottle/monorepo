import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardGithubTokenEmptyState } from './DashboardGithubTokenEmptyState';
import { GITHUB_STATS_TOKEN_EMPTY_STATE_COPY } from '~/routing/dashboard/data/data.copy';

describe('DashboardGithubTokenEmptyState Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<DashboardGithubTokenEmptyState />);
  });

  test('prompts the user to configure GITHUB_TOKEN', () => {
    expect(
      component.getByText(GITHUB_STATS_TOKEN_EMPTY_STATE_COPY.title),
    ).toBeInTheDocument();
    expect(
      component.getByText(GITHUB_STATS_TOKEN_EMPTY_STATE_COPY.description),
    ).toBeInTheDocument();
  });

  test('names the GITHUB_TOKEN env var in its copy', () => {
    expect(GITHUB_STATS_TOKEN_EMPTY_STATE_COPY.title).toContain('GITHUB_TOKEN');
    expect(GITHUB_STATS_TOKEN_EMPTY_STATE_COPY.description).toContain(
      'GITHUB_TOKEN',
    );
  });
});
