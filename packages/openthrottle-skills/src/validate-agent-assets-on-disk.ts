import type { AgentAssetValidationIssue } from './schemas/agent-asset-frontmatter.schemas.ts';
import {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.ts';
import type { ValidateAgentAssetsResult } from './validate-agent-asset-frontmatter.ts';
import {
  walkAgentAssetFiles,
  type WalkAgentAssetsOptions,
} from './walk-agent-assets-on-disk.ts';

/**
 * @description Walks `.agents/` SSOT trees and validates frontmatter per D5.
 * @public
 */
export const validateAgentAssetsOnDisk = (
  options: WalkAgentAssetsOptions,
): ValidateAgentAssetsResult => {
  const { files, warnings: walkWarnings } = walkAgentAssetFiles(options);
  const results = [];

  for (const file of files) {
    results.push(
      validateAgentAssetFrontmatter({
        content: file.content,
        expectedSlug: file.slug,
        kind: file.kind,
        path: file.path,
      }),
    );
  }

  const merged = mergeValidationResults(results);

  return {
    errors: merged.errors,
    warnings: [...walkWarnings, ...merged.warnings],
  };
};

export type { AgentAssetValidationIssue, WalkAgentAssetsOptions };
