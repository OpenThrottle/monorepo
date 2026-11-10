import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ModelRoutingPolicyResult } from '../contract/index.ts';
import { MODEL_ROUTING_POLICY_RELATIVE_PATH } from '../data/data.model-routing.ts';
import { parseModelRoutingPolicy } from './parse-model-routing-policy.ts';

/**
 * @description Loads and schema-checks the routing policy by path. Pass the file path directly, or
 * use {@link readModelRoutingPolicyFromRoot}. Never throws: unreadable or malformed files come back
 * as `invalid`.
 * @public
 */
export const readModelRoutingPolicy = async (
  filePath: string,
): Promise<ModelRoutingPolicyResult> => {
  let text: string;

  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'invalid', reason: `cannot read ${filePath}: ${message}` };
  }

  try {
    return parseModelRoutingPolicy(JSON.parse(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      kind: 'invalid',
      reason: `${filePath} is not valid JSON: ${message}`,
    };
  }
};

/**
 * @description Loads the policy from `skills/ot-loop/references/model-routing.json` under a
 * monorepo (or worktree) root.
 * @public
 */
export const readModelRoutingPolicyFromRoot = (
  root: string,
): Promise<ModelRoutingPolicyResult> => {
  return readModelRoutingPolicy(join(root, MODEL_ROUTING_POLICY_RELATIVE_PATH));
};
