import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { GetUsageTelemetryCoverageQuery } from '~/__generated__/graphql';
import { GetUsageTelemetryCoverageDocument } from '~/__generated__/graphql';

/**
 * The `telemetryCoverage` result, or `null` when the query fails. Coverage is
 * a diagnostic section: its failure must not take the rest of /usage down with
 * it, so the loader renders the section's own "unavailable" state instead.
 */
export const fetchTelemetryCoverage = async (
  request: Request,
): Promise<GetUsageTelemetryCoverageQuery['telemetryCoverage'] | null> => {
  try {
    const result = await executeGraphqlWithAuth(
      request,
      GetUsageTelemetryCoverageDocument,
      {},
    );

    return result?.telemetryCoverage ?? null;
  } catch (error) {
    console.error(`Failed to load telemetry coverage`, error);

    return null;
  }
};
