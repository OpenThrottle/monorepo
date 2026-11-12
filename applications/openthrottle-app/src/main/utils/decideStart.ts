import type { ProbeOtServerResult } from '../server/probeOtServer.ts';

export type StartDecision =
  | { readonly kind: 'app'; readonly serverUrl: string }
  | {
      readonly kind: 'connect';
      readonly notice: string | undefined;
      readonly prefill: string;
    };

export interface DecideStartOptions {
  readonly defaultUrl: string;
  /** `OPENTHROTTLE_SERVER_URL`, already normalized; `undefined` when unset or invalid. */
  readonly envUrl: string | undefined;
  readonly probe: (serverUrl: string) => Promise<ProbeOtServerResult>;
  /** The persisted server origin; `undefined` before first run. */
  readonly settingsUrl: string | undefined;
}

/**
 * @description The start-up choice between the app and the connection screen.
 * Precedence: env `OPENTHROTTLE_SERVER_URL` > `settings.json` > first run. A
 * configured server that fails its probe sends the user to the connection
 * screen (prefilled, with the reason) instead of a broken window.
 */
export const decideStart = async (
  options: DecideStartOptions,
): Promise<StartDecision> => {
  const { defaultUrl, envUrl, probe, settingsUrl } = options;
  const configured = envUrl ?? settingsUrl;

  if (configured === undefined) {
    return { kind: 'connect', notice: undefined, prefill: defaultUrl };
  }

  const result = await probe(configured);

  if (result.ok) {
    return { kind: 'app', serverUrl: configured };
  }

  return { kind: 'connect', notice: result.reason, prefill: configured };
};
