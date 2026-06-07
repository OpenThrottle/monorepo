/** @publicApi */
export {
  AGENT_ASSET_SLUG_PATTERN,
  personaFrontmatterSchema,
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
} from './schemas/agent-asset-frontmatter.schemas.js';
export type {
  AgentAssetKind,
  AgentAssetValidationIssue,
  PersonaFrontmatter,
  RuleFrontmatter,
  SkillFrontmatter,
} from './schemas/agent-asset-frontmatter.schemas.js';

/** @publicApi */
export {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
} from './frontmatter/extract-frontmatter-body.js';
/** @publicApi */
export { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.js';
export type {
  FrontmatterScalar,
  ParsedYamlFrontmatter,
} from './frontmatter/parse-yaml-frontmatter.js';

/** @publicApi */
export {
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
} from './parse-skill-frontmatter.js';
export type { ParsedSkillFrontmatter } from './parse-skill-frontmatter.js';

/** @publicApi */
export {
  parseRuleFrontmatter,
  parseRuleFrontmatterForValidation,
} from './parse-rule-frontmatter.js';
export type { ParsedRuleFrontmatter } from './parse-rule-frontmatter.js';

/** @publicApi */
export {
  parsePersonaFrontmatter,
  parsePersonaFrontmatterForValidation,
} from './parse-persona-frontmatter.js';
export type { ParsedPersonaFrontmatter } from './parse-persona-frontmatter.js';

/** @publicApi */
export {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.js';
export type {
  ValidateAgentAssetFrontmatterInput,
  ValidateAgentAssetFrontmatterResult,
  ValidateAgentAssetsResult,
} from './validate-agent-asset-frontmatter.js';

/** @publicApi */
export {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  mapAgentAssetFileToIngestRecord,
  mapAgentAssetFilesToIngestRecords,
} from './map-agent-assets-for-ingest.js';
export type {
  AgentAssetIngestRecord,
  AgentAssetPromptType,
} from './map-agent-assets-for-ingest.js';

/** @publicApi */
export { collectAgentAssetsForIngest } from './collect-agent-assets-for-ingest.js';
export type { CollectAgentAssetsForIngestResult } from './collect-agent-assets-for-ingest.js';

/** @publicApi */
export { validateAgentAssetsOnDisk } from './validate-agent-assets-on-disk.js';
export type { WalkAgentAssetsOptions } from './validate-agent-assets-on-disk.js';

/** @publicApi */
export { walkAgentAssetFiles } from './walk-agent-assets-on-disk.js';
export type { AgentAssetFileEntry } from './walk-agent-assets-on-disk.js';
