import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { AgentSearchEmpty } from '../AgentSearchEmpty';
import type { AgentSearchEmptyProps } from '../AgentSearchEmpty';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';

describe('AgentSearchEmpty Component', () => {
  let component: RenderResult;
  let props: AgentSearchEmptyProps;

  beforeEach(() => {
    props = {};
    component = render(<AgentSearchEmpty {...props} />);
  });

  test('renders the empty-state container', () => {
    expect(component.getByTestId('AgentSearchEmpty')).toBeInTheDocument();
  });

  test('renders the empty heading and message copy', () => {
    expect(
      component.getByText(AGENT_SEARCH_COPY.emptyHeading),
    ).toBeInTheDocument();
    expect(
      component.getByText(AGENT_SEARCH_COPY.emptyMessage),
    ).toBeInTheDocument();
  });
});
