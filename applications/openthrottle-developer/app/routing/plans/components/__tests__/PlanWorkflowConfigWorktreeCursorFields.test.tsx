import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { PlanWorkflowConfigWorktreeCursorFields } from '../PlanWorkflowConfigWorktreeCursorFields';
import type { PlanWorkflowConfigWorktreeCursorFieldsProps } from '../PlanWorkflowConfigWorktreeCursorFields';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

const renderFields = (
  props: PlanWorkflowConfigWorktreeCursorFieldsProps,
): RenderResult => {
  const Component = () => <PlanWorkflowConfigWorktreeCursorFields {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanWorkflowConfigWorktreeCursorFields Component', () => {
  test('renders the cursor-only fields for the cursor backend', () => {
    const component = renderFields({
      input: getDefaultWorkflowRalphRunOptionsInput({ planId: 'plan-1' }),
      setInput: vi.fn(),
    });

    expect(
      component.getByLabelText('Base branch for cursor-agent --worktree-base'),
    ).toBeInTheDocument();
    expect(
      component.getByLabelText('Enable --skip-worktree-setup for cursor-agent'),
    ).toBeInTheDocument();
  });

  test('explains the fields are cursor-only for another backend', () => {
    const component = renderFields({
      input: {
        ...getDefaultWorkflowRalphRunOptionsInput({ planId: 'plan-1' }),
        executionBackend: 'claude',
      },
      setInput: vi.fn(),
    });

    expect(
      component.queryByLabelText(
        'Base branch for cursor-agent --worktree-base',
      ),
    ).not.toBeInTheDocument();
    expect(
      component.getByText(/apply only when the execution backend is Cursor/),
    ).toBeInTheDocument();
  });
});
