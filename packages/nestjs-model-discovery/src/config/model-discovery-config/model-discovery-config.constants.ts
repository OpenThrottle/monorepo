import { registerAs } from '@nestjs/config';

import { MODEL_DISCOVERY_CONFIG_NAMESPACE } from '../config.constants.ts';
import type { ModelDiscoveryConfig } from '../config.types.ts';
import { buildModelDiscoveryConfig } from '../config.utils.ts';

/** Config namespace consumed via `ConfigService.get('modelDiscovery')`. */
export const modelDiscoveryConfig = registerAs(
  MODEL_DISCOVERY_CONFIG_NAMESPACE,
  (): ModelDiscoveryConfig => buildModelDiscoveryConfig(process.env),
);
