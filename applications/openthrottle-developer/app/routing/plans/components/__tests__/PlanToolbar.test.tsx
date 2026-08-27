import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanToolbar } from '../PlanToolbar';
import type { PlanToolbarProps } from '../PlanToolbar';
import { renderRouteHarness, renderRoutesStub } from '~/testing/route-fixtures';
import { WorkspaceEditorId } from '~/__generated__/graphql';

const renderToolbar = (toolbarProps: PlanToolbarProps): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <PlanToolbar {...toolbarProps} />
    </TooltipProvider>,
  );

describe('PlanToolbar Component', () => {
  let component: RenderResult;
  let props: PlanToolbarProps;

  beforeEach(() => {
    props = { planId: 'test-plan-id' };

    component = renderToolbar(props);
  });

  test('should render actions and links scoped to planId', () => {
    expect(component.getByTestId('PlanToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /mark complete/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /^actions$/i }),
    ).toBeInTheDocument();
  });

  test('submits empty ralphTuning when ralphTuningJson is omitted', () => {
    const el = component.container.querySelector('input[name="ralphTuning"]');
    if (!(el instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning input');
    }
    expect(el.value).toBe('');
  });

  test('passes ralphTuningJson to hidden ralphTuning field for enqueue', () => {
    const payload = JSON.stringify({
      iterations: 3,
      project: 'applications/openthrottle-server',
    });
    const withTuning = renderToolbar({
      planId: 'test-plan-id',
      ralphTuningJson: payload,
    });
    const el = withTuning.container.querySelector('input[name="ralphTuning"]');
    if (!(el instanceof HTMLInputElement)) {
      throw new Error('expected ralphTuning input');
    }
    expect(el.value).toBe(payload);
  });

  test('shows In progress and Kill run while a plan run is active', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'IN_PROGRESS',
      planTitle: 'My Plan',
    });
    expect(
      r.getByRole('button', { name: /^In progress$/i }),
    ).toBeInTheDocument();
    expect(
      r.getByRole('button', { name: /Kill plan run for My Plan/i }),
    ).toBeInTheDocument();
  });

  test('shows Add to Queue and hides Kill run when plan is idle (e.g. after cancel)', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'PENDING',
      planTitle: 'My Plan',
    });
    expect(
      r.getByRole('button', { name: /^Add to Queue$/i }),
    ).toBeInTheDocument();
    expect(
      r.queryByRole('button', { name: /Kill plan run/i }),
    ).not.toBeInTheDocument();
  });

  test('disables enqueue when workflowRunBlocked is true', () => {
    const r = renderToolbar({
      planId: 'p1',
      planStatus: 'PENDING',
      planTitle: 'My Plan',
      workflowRunBlocked: true,
      workflowRunBlockedReason: 'Fix CLI options',
    });
    expect(r.getByRole('button', { name: /^Add to Queue$/i })).toBeDisabled();
  });

  test('does not render tag chips when tag props are omitted', () => {
    expect(component.queryByTestId('PlanTagChips')).not.toBeInTheDocument();
  });

  // Accessible name of the Run/Queue button varies by status (getRunButtonLabel).
  const runButtonName: Record<string, RegExp> = {
    CANCELED: /^Run plan$/i,
    COMPLETED: /^Completed$/i,
    IN_PROGRESS: /^In progress$/i,
    PENDING: /^Add to Queue$/i,
    QUEUED: /^Queued$/i,
    SKIPPED: /^Skipped$/i,
  };

  test.each(['QUEUED', 'IN_PROGRESS'] as const)(
    'disables Run, Evaluate rules, and Mark Complete while the plan run is active (%s)',
    (planStatus) => {
      const r = within(
        renderToolbar({ planId: 'p1', planStatus, planTitle: 'My Plan' })
          .container,
      );
      expect(
        r.getByRole('button', { name: runButtonName[planStatus] }),
      ).toBeDisabled();
      expect(r.getByRole('button', { name: /evaluate rules/i })).toBeDisabled();
      expect(r.getByRole('button', { name: /mark complete/i })).toBeDisabled();
    },
  );

  test('keeps Run and Evaluate rules enabled for a PENDING (non-terminal, not-running) plan', () => {
    const r = within(
      renderToolbar({
        branch: 'feature/test',
        planId: 'p1',
        planStatus: 'PENDING',
        planTitle: 'My Plan',
      }).container,
    );
    expect(
      r.getByRole('button', { name: runButtonName.PENDING }),
    ).not.toBeDisabled();
    expect(
      r.getByRole('button', { name: /evaluate rules/i }),
    ).not.toBeDisabled();
  });

  test('disables Run (but not Evaluate rules) when the required branch is blank', () => {
    const r = within(
      renderToolbar({
        branch: '',
        planId: 'p1',
        planStatus: 'PENDING',
        planTitle: 'My Plan',
      }).container,
    );
    // Branch is a required enqueue input; Run is gated until it is provided.
    expect(
      r.getByRole('button', { name: runButtonName.PENDING }),
    ).toBeDisabled();
    // Evaluate rules does not enqueue a run, so it stays enabled.
    expect(
      r.getByRole('button', { name: /evaluate rules/i }),
    ).not.toBeDisabled();
  });

  test.each(['COMPLETED', 'CANCELED', 'SKIPPED'] as const)(
    'disables Run and Evaluate rules when the plan is terminal (%s)',
    (planStatus) => {
      const r = within(
        renderToolbar({ planId: 'p1', planStatus, planTitle: 'My Plan' })
          .container,
      );
      expect(
        r.getByRole('button', { name: runButtonName[planStatus] }),
      ).toBeDisabled();
      expect(r.getByRole('button', { name: /evaluate rules/i })).toBeDisabled();
    },
  );

  test('keeps Mark Complete enabled for a PENDING (not-running) plan', () => {
    const r = within(
      renderToolbar({
        planId: 'p1',
        planStatus: 'PENDING',
        planTitle: 'My Plan',
      }).container,
    );
    expect(
      r.getByRole('button', { name: /mark complete/i }),
    ).not.toBeDisabled();
  });

  test('disables Mark Complete for COMPLETED but keeps it enabled for CANCELED/SKIPPED (recovery path)', () => {
    const completed = within(
      renderToolbar({
        planId: 'p1',
        planStatus: 'COMPLETED',
        planTitle: 'My Plan',
      }).container,
    );
    expect(
      completed.getByRole('button', { name: /mark complete/i }),
    ).toBeDisabled();

    for (const planStatus of ['CANCELED', 'SKIPPED'] as const) {
      const r = within(
        renderToolbar({ planId: 'p1', planStatus, planTitle: 'My Plan' })
          .container,
      );
      expect(
        r.getByRole('button', { name: /mark complete/i }),
      ).not.toBeDisabled();
    }
  });

  test.each(['QUEUED', 'IN_PROGRESS'] as const)(
    'keeps Kill run available while the plan run is active (%s)',
    (planStatus) => {
      const r = within(
        renderToolbar({ planId: 'p1', planStatus, planTitle: 'My Plan' })
          .container,
      );
      expect(
        r.getByRole('button', { name: /Kill plan run for My Plan/i }),
      ).not.toBeDisabled();
    },
  );

  test('renders tag chips and wires removal when the tag contract is provided', async () => {
    const user = userEvent.setup();
    const onRemoveTag = vi.fn();
    const r = renderToolbar({
      onAddTag: vi.fn(),
      onRemoveTag,
      planId: 'p1',
      tagVocabulary: [{ dimension: 'domain', tag: 'frontend' }],
      tags: [{ dimension: 'domain', source: 'human', tag: 'backend' }],
    });

    expect(r.getByTestId('PlanTagChips')).toBeInTheDocument();
    expect(r.getByText('backend')).toBeInTheDocument();

    await user.click(r.getByRole('button', { name: /Remove tag backend/i }));
    expect(onRemoveTag).toHaveBeenCalledWith('backend');
  });

  test('replaces Kill run with a Stale badge when the newest run is stale', () => {
    const r = renderToolbar({
      newestRunIsStale: true,
      planId: 'p1',
      planStatus: 'IN_PROGRESS',
      planTitle: 'My Plan',
    });

    expect(
      r.queryByRole('button', { name: /Kill plan run/i }),
    ).not.toBeInTheDocument();
    expect(r.getByText('Stale')).toBeInTheDocument();
  });
});

const PLAN_ID = 'plan-123';

/**
 * Render the toolbar inside a routes stub whose action records submitted
 * FormData, so we can assert the fetcher posts the right intent + planId.
 */
const renderToolbarWithAction = (
  props: Partial<PlanToolbarProps> = {},
): {
  component: RenderResult;
  submitted: {
    intent: FormDataEntryValue | null;
    planId: FormDataEntryValue | null;
  }[];
} => {
  const submitted: {
    intent: FormDataEntryValue | null;
    planId: FormDataEntryValue | null;
  }[] = [];

  const action = async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    submitted.push({
      intent: formData.get('intent'),
      planId: formData.get('planId'),
    });
    return { evaluatePlanRulesTriggered: true };
  };

  const component = renderRouteHarness([
    {
      Component: () => <PlanToolbar planId={PLAN_ID} {...props} />,
      action,
      path: '/',
    },
  ]);

  return { component, submitted };
};

describe('PlanToolbar evaluate-rules submit', () => {
  test('submits the evaluatePlanRules intent with the planId', async () => {
    const { component, submitted } = renderToolbarWithAction();
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: /evaluate rules/i }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({
      intent: 'evaluatePlanRules',
      planId: PLAN_ID,
    });
  });
});

describe('PlanToolbar editor deep links', () => {
  test('renders PlanEditorActions alongside the CLI preview link', () => {
    const component = renderToolbar({
      editorWorkingDirectory: '/Users/matt/Development/openthrottle',
      editors: [WorkspaceEditorId.Claude],
      planId: PLAN_ID,
    });

    expect(component.getByTestId('PlanEditorActions')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Claude Code' }),
    ).toHaveAttribute(
      'href',
      `claude://code/new?folder=%2FUsers%2Fmatt%2FDevelopment%2Fopenthrottle&q=%2Fot-claude-loop%20${PLAN_ID}`,
    );
    expect(
      component.getByRole('link', { name: /cli preview and history/i }),
    ).toBeInTheDocument();
  });

  test('renders only the CLI preview link when no editor is enabled', () => {
    const component = renderToolbar({ planId: PLAN_ID });

    expect(component.queryByTestId('PlanEditorActions')).toBeNull();
    expect(
      component.getByRole('link', { name: /cli preview and history/i }),
    ).toBeInTheDocument();
  });
});
