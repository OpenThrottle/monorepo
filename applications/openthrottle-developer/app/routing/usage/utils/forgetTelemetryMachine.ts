import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import { ForgetUsageTelemetryMachineDocument } from '~/__generated__/graphql';
import { FORGET_TELEMETRY_MACHINE_INTENT } from '~/routing/usage/data/data.telemetry-coverage-copy';

/** The machine was forgotten; `deletedCount` is how many heartbeat rows went. */
interface ForgetTelemetryMachineSuccess {
  readonly deletedCount: number;
  readonly kind: 'forgotten';
  readonly machineId: string;
}

/** The submission was not a forget, or carried no machine id. */
interface ForgetTelemetryMachineIgnored {
  readonly kind: 'ignored';
}

/** The mutation failed; the row stays and the error is logged. */
interface ForgetTelemetryMachineFailure {
  readonly kind: 'failed';
  readonly machineId: string;
}

export type ForgetTelemetryMachineResult =
  | ForgetTelemetryMachineFailure
  | ForgetTelemetryMachineIgnored
  | ForgetTelemetryMachineSuccess;

/**
 * @description Handle the /usage coverage row's "Forget machine" submission:
 * read `intent` + `machineId` from the form and run the mutation. Never
 * throws, so a failed forget leaves the page (and the row) in place.
 */
export const forgetTelemetryMachine = async (
  request: Request,
): Promise<ForgetTelemetryMachineResult> => {
  const formData = await request.formData();
  const machineId = formData.get('machineId');

  if (
    formData.get('intent') !== FORGET_TELEMETRY_MACHINE_INTENT ||
    typeof machineId !== 'string' ||
    machineId.trim() === ''
  ) {
    return { kind: 'ignored' };
  }

  try {
    const result = await executeGraphqlWithAuth(
      request,
      ForgetUsageTelemetryMachineDocument,
      { machineId },
    );

    return {
      deletedCount: result?.forgetTelemetryMachine ?? 0,
      kind: 'forgotten',
      machineId,
    };
  } catch (error) {
    console.error(`Failed to forget telemetry machine`, error);

    return { kind: 'failed', machineId };
  }
};
