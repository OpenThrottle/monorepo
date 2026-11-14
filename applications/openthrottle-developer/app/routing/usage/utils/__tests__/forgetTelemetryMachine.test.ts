import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ForgetUsageTelemetryMachineDocument } from '~/__generated__/graphql';
import { FORGET_TELEMETRY_MACHINE_INTENT } from '~/routing/usage/data/data.telemetry-coverage-copy';

import { forgetTelemetryMachine } from '../forgetTelemetryMachine';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const post = (fields: Record<string, string>): Request => {
  return new Request('http://localhost/usage?index', {
    body: new URLSearchParams(fields),
    method: 'POST',
  });
};

describe('forgetTelemetryMachine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('when the form is a forget with a machine id', () => {
    test('runs the mutation and reports the deleted count', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        forgetTelemetryMachine: 4,
      });
      const request = post({
        intent: FORGET_TELEMETRY_MACHINE_INTENT,
        machineId: 'm1',
      });

      await expect(forgetTelemetryMachine(request)).resolves.toEqual({
        deletedCount: 4,
        kind: 'forgotten',
        machineId: 'm1',
      });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        ForgetUsageTelemetryMachineDocument,
        { machineId: 'm1' },
      );
    });
  });

  describe('when the mutation fails', () => {
    test('returns failed instead of throwing', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('boom'));

      await expect(
        forgetTelemetryMachine(
          post({ intent: FORGET_TELEMETRY_MACHINE_INTENT, machineId: 'm1' }),
        ),
      ).resolves.toEqual({ kind: 'failed', machineId: 'm1' });
    });
  });

  describe('when the form is not a forget', () => {
    test('ignores another intent or a blank machine id', async () => {
      await expect(
        forgetTelemetryMachine(post({ intent: 'other', machineId: 'm1' })),
      ).resolves.toEqual({ kind: 'ignored' });
      await expect(
        forgetTelemetryMachine(
          post({ intent: FORGET_TELEMETRY_MACHINE_INTENT, machineId: ' ' }),
        ),
      ).resolves.toEqual({ kind: 'ignored' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });
});
