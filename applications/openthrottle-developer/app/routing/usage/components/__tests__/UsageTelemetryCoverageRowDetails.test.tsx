import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UsageTelemetryCoverageMachineFragment } from '~/__generated__/graphql';
import {
  FORGET_TELEMETRY_MACHINE_INTENT,
  TELEMETRY_COVERAGE_COPY,
} from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryMachine,
  TELEMETRY_COVERAGE_NOW_ISO,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';

import { UsageTelemetryCoverageRowDetails } from '../UsageTelemetryCoverageRowDetails';

interface Submitted {
  formData: FormData | null;
}

/** Mounts the popover in a route whose action records what was posted. */
const renderInRoute = (
  machine: UsageTelemetryCoverageMachineFragment,
  submitted: Submitted,
): ReturnType<typeof render> => {
  const RoutesStub = createRoutesStub([
    {
      Component: () => {
        return (
          <UsageTelemetryCoverageRowDetails
            machine={machine}
            nowIso={TELEMETRY_COVERAGE_NOW_ISO}
          />
        );
      },
      action: async ({ request }) => {
        submitted.formData = await request.formData();
        return null;
      },
      path: '/',
    },
  ]);

  return render(<RoutesStub />);
};

describe('UsageTelemetryCoverageRowDetails Component', () => {
  test('lists org/repo with per-leg last-seen and a no-remote row', async () => {
    const user = userEvent.setup();
    const component = renderInRoute(buildTelemetryMachine(), {
      formData: null,
    });

    await user.click(
      component.getByRole('button', {
        name: TELEMETRY_COVERAGE_COPY.detailsAriaLabel('work-laptop'),
      }),
    );

    expect(
      await component.findByText(
        'OpenThrottle/monorepo: Repo hooks 2h ago, Plugin 1d ago',
      ),
    ).toBeInTheDocument();
    expect(
      component.getByText(TELEMETRY_COVERAGE_COPY.detailsNoRemote),
    ).toBeInTheDocument();
  });

  test('says so when the machine reported no repos', async () => {
    const user = userEvent.setup();
    const component = renderInRoute(buildTelemetryMachine({ repos: [] }), {
      formData: null,
    });

    await user.click(component.getByRole('button'));

    expect(
      await component.findByText(TELEMETRY_COVERAGE_COPY.detailsNoRepos),
    ).toBeInTheDocument();
  });

  describe('Forget machine', () => {
    test('posts the machine id only after the confirm', async () => {
      const user = userEvent.setup();
      const submitted: Submitted = { formData: null };
      const machine = buildTelemetryMachine();
      const component = renderInRoute(machine, submitted);

      await user.click(component.getByRole('button'));
      await user.click(
        await component.findByRole('menuitem', {
          name: TELEMETRY_COVERAGE_COPY.forgetLabel,
        }),
      );

      expect(
        component.getByRole('alertdialog', {
          name: TELEMETRY_COVERAGE_COPY.forgetTitle('work-laptop'),
        }),
      ).toBeInTheDocument();
      expect(submitted.formData).toBeNull();

      await user.click(
        component.getByRole('button', {
          name: TELEMETRY_COVERAGE_COPY.forgetConfirm,
        }),
      );

      expect(submitted.formData?.get('intent')).toBe(
        FORGET_TELEMETRY_MACHINE_INTENT,
      );
      expect(submitted.formData?.get('machineId')).toBe(machine.machineId);
    });

    test('posts nothing when the confirm is cancelled', async () => {
      const user = userEvent.setup();
      const submitted: Submitted = { formData: null };
      const component = renderInRoute(buildTelemetryMachine(), submitted);

      await user.click(component.getByRole('button'));
      await user.click(
        await component.findByRole('menuitem', {
          name: TELEMETRY_COVERAGE_COPY.forgetLabel,
        }),
      );
      await user.click(
        component.getByRole('button', {
          name: TELEMETRY_COVERAGE_COPY.forgetCancel,
        }),
      );

      expect(submitted.formData).toBeNull();
    });
  });
});
