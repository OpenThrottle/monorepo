/** @publicApi */
export {
  AGENT_ASSET_SLUG_PATTERN,
  personaFrontmatterSchema,
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
} from './schemas/agent-asset-frontmatter.schemas.ts';
export type {
  AgentAssetKind,
  AgentAssetValidationIssue,
  PersonaFrontmatter,
  RuleFrontmatter,
  SkillFrontmatter,
} from './schemas/agent-asset-frontmatter.schemas.ts';

/** @publicApi */
export {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
} from './frontmatter/extract-frontmatter-body.ts';
/** @publicApi */
export { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
export type {
  FrontmatterScalar,
  ParsedYamlFrontmatter,
} from './frontmatter/parse-yaml-frontmatter.ts';

/** @publicApi */
export {
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
} from './parse-skill-frontmatter.ts';
export type { ParsedSkillFrontmatter } from './parse-skill-frontmatter.ts';

/** @publicApi */
export {
  parseRuleFrontmatter,
  parseRuleFrontmatterForValidation,
} from './parse-rule-frontmatter.ts';
export type { ParsedRuleFrontmatter } from './parse-rule-frontmatter.ts';

/** @publicApi */
export {
  parsePersonaFrontmatter,
  parsePersonaFrontmatterForValidation,
} from './parse-persona-frontmatter.ts';
export type { ParsedPersonaFrontmatter } from './parse-persona-frontmatter.ts';

/** @publicApi */
export {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.ts';
export type {
  ValidateAgentAssetFrontmatterInput,
  ValidateAgentAssetFrontmatterResult,
  ValidateAgentAssetsResult,
} from './validate-agent-asset-frontmatter.ts';

/** @publicApi */
export {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  mapAgentAssetFileToIngestRecord,
  mapAgentAssetFilesToIngestRecords,
} from './map-agent-assets-for-ingest.ts';
export type {
  AgentAssetIngestRecord,
  AgentAssetPromptType,
} from './map-agent-assets-for-ingest.ts';

/** @publicApi */
export { collectAgentAssetsForIngest } from './collect-agent-assets-for-ingest.ts';
export type { CollectAgentAssetsForIngestResult } from './collect-agent-assets-for-ingest.ts';

/** @publicApi */
export { validateAgentAssetsOnDisk } from './validate-agent-assets-on-disk.ts';
export type { WalkAgentAssetsOptions } from './validate-agent-assets-on-disk.ts';

/** @publicApi */
export { walkAgentAssetFiles } from './walk-agent-assets-on-disk.ts';
export type { AgentAssetFileEntry } from './walk-agent-assets-on-disk.ts';
