import {
  mapAgentAssetFilesToIngestRecords,
  type AgentAssetIngestRecord,
} from './map-agent-assets-for-ingest.ts';
import type { ValidateAgentAssetsResult } from './validate-agent-asset-frontmatter.ts';
import { validateAgentAssetsOnDisk } from './validate-agent-assets-on-disk.ts';
import {
  walkAgentAssetFiles,
  type WalkAgentAssetsOptions,
} from './walk-agent-assets-on-disk.ts';

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
  const { files } = walkAgentAssetFiles(options);
  const records = mapAgentAssetFilesToIngestRecords(files);

  return { records, validation };
};
