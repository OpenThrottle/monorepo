import {
  mapAgentAssetFilesToIngestRecords,
  type AgentAssetIngestRecord,
} from './map-agent-assets-for-ingest.js';
import type { ValidateAgentAssetsResult } from './validate-agent-asset-frontmatter.js';
import { validateAgentAssetsOnDisk } from './validate-agent-assets-on-disk.js';
import {
  walkAgentAssetFiles,
  type WalkAgentAssetsOptions,
} from './walk-agent-assets-on-disk.js';

export interface CollectAgentAssetsForIngestResult {
  readonly records: readonly AgentAssetIngestRecord[];
  readonly validation: ValidateAgentAssetsResult;
}

/**
 * @description Validates `.agents/` frontmatter (D5) and maps files to `custom_prompts` ingest rows.
 * @publicApi
 */
export const collectAgentAssetsForIngest = (
  options: WalkAgentAssetsOptions,
): CollectAgentAssetsForIngestResult => {
  const validation = validateAgentAssetsOnDisk(options);
  const files = walkAgentAssetFiles(options);
  const records = mapAgentAssetFilesToIngestRecords(files);

  return { records, validation };
};
