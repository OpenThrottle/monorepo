import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';
import { AgentSearchForm } from '../AgentSearchForm';
import type { AgentSearchFormProps } from '../AgentSearchForm';

describe('AgentSearchForm Component', () => {
  let component: RenderResult;
  let props: AgentSearchFormProps;

  beforeEach(() => {
    props = {};

    component = render(<AgentSearchForm {...props} />);
  });

  test('renders the search form with the query input and submit button', () => {
    const form = component.getByTestId('AgentSearchForm');
    expect(form).toBeInTheDocument();

    expect(
      component.getByPlaceholderText(AGENT_SEARCH_COPY.searchPlaceholder),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Search' }),
    ).toBeInTheDocument();
  });

  test('does not render hidden type/projectId inputs when tab/projectId are unset', () => {
    const form = component.getByTestId('AgentSearchForm');
    expect(form.querySelector('input[name="type"]')).toBeNull();
    expect(form.querySelector('input[name="projectId"]')).toBeNull();
  });

  test('renders hidden inputs for a non-"all" tab and a projectId', () => {
    component.unmount();
    component = render(<AgentSearchForm projectId="project-1" tab="skills" />);

    const form = component.getByTestId('AgentSearchForm');
    expect(form.querySelector('input[name="type"]')).toHaveValue('skills');
    expect(form.querySelector('input[name="projectId"]')).toHaveValue(
      'project-1',
    );
  });

  test('updates the query input value as the user types', async () => {
    const user = userEvent.setup();
    const input = component.getByPlaceholderText(
      AGENT_SEARCH_COPY.searchPlaceholder,
    );

    await user.type(input, 'hello');

    expect(input).toHaveValue('hello');
  });
});
