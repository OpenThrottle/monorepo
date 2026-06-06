import type { AgentAssetValidationIssue } from './schemas/agent-asset-frontmatter.schemas.js';
import {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.js';
import type { ValidateAgentAssetsResult } from './validate-agent-asset-frontmatter.js';
import {
  walkAgentAssetFiles,
  type WalkAgentAssetsOptions,
} from './walk-agent-assets-on-disk.js';

/**
 * @description Walks `.agents/` SSOT trees and validates frontmatter per D5.
 * @publicApi
 */
export const validateAgentAssetsOnDisk = (
  options: WalkAgentAssetsOptions,
): ValidateAgentAssetsResult => {
  const results = [];

  for (const file of walkAgentAssetFiles(options)) {
    results.push(
      validateAgentAssetFrontmatter({
        content: file.content,
        expectedSlug: file.slug,
        kind: file.kind,
        path: file.path,
      }),
    );
  }

  return mergeValidationResults(results);
};

export type { AgentAssetValidationIssue, WalkAgentAssetsOptions };
