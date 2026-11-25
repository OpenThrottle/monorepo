import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GLOBAL_ERROR_BOUNDARY_COPY } from '../../data/copy';
import type { GlobalErrorBoundaryReferencePanelProps } from '../GlobalErrorBoundaryReferencePanel';
import { GlobalErrorBoundaryReferencePanel } from '../GlobalErrorBoundaryReferencePanel';

describe('GlobalErrorBoundaryReferencePanel Component', () => {
  let component: RenderResult;
  let props: GlobalErrorBoundaryReferencePanelProps;

  // Reads `props` at render time, so a nested beforeEach can swap them first.
  const Component = () => {
    return <GlobalErrorBoundaryReferencePanel {...props} />;
  };
  const renderPanel = (): RenderResult => {
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      classificationSummary: 'JavaScript · generic application error',
      incidentReferenceId: 'ot-incident-123',
      onCopyIncidentDetails: vi.fn().mockResolvedValue(undefined),
      onCopyReferenceId: vi.fn().mockResolvedValue(undefined),
    };

    component = renderPanel();
  });

  test('renders the support reference panel with the incident id and classification summary', () => {
    expect(
      component.getByTestId('GlobalErrorBoundaryReferencePanel'),
    ).toBeInTheDocument();
    expect(component.getByText('Support reference')).toBeInTheDocument();
    expect(component.getByText('ot-incident-123')).toBeInTheDocument();
    expect(
      component.getByText('JavaScript · generic application error'),
    ).toBeInTheDocument();
  });

  test('explains crash reporting is inactive when no usable Rollbar token is configured', () => {
    expect(
      component.getByText(/crash reporting is not active in this environment/i),
    ).toBeInTheDocument();
  });

  test('calls onCopyReferenceId when the "Copy reference id" button is clicked', async () => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', { name: 'Copy reference id' }),
    );
    expect(props.onCopyReferenceId).toHaveBeenCalledTimes(1);
  });

  test('calls onCopyIncidentDetails when the "Copy incident details" button is clicked', async () => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', { name: 'Copy incident details' }),
    );
    expect(props.onCopyIncidentDetails).toHaveBeenCalledTimes(1);
  });

  describe('before hydration (no reference id yet)', () => {
    beforeEach(() => {
      component.unmount();
      props = { ...props, incidentReferenceId: null };
      component = renderPanel();
    });

    test('shows the pending placeholder instead of an id', () => {
      expect(
        component.getByText(GLOBAL_ERROR_BOUNDARY_COPY.pendingReferenceId),
      ).toBeInTheDocument();
    });

    test('disables both copy actions', () => {
      expect(
        component.getByRole('button', { name: 'Copy reference id' }),
      ).toBeDisabled();
      expect(
        component.getByRole('button', { name: 'Copy incident details' }),
      ).toBeDisabled();
    });
  });
});
