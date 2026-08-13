import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { AgentSearchIntroduction } from '../AgentSearchIntroduction';
import type { AgentSearchIntroductionProps } from '../AgentSearchIntroduction';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';

describe('AgentSearchIntroduction Component', () => {
  let component: RenderResult;
  let props: AgentSearchIntroductionProps;

  beforeEach(() => {
    props = {};
    component = render(<AgentSearchIntroduction {...props} />);
  });

  test('renders the heading and body copy', () => {
    expect(component.getByTestId('AgentSearchIntroduction')).toBeTruthy();
    expect(component.getByText(AGENT_SEARCH_COPY.introHeading)).toBeTruthy();
    expect(component.getByText(AGENT_SEARCH_COPY.introBody)).toBeTruthy();
  });
});
