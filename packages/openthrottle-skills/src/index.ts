/** @public */
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

/** @public */
export { DEFAULT_SKILL_TAG_VOCABULARY } from './default-skill-tag-vocabulary.ts';
export type { DefaultSkillTag } from './default-skill-tag-vocabulary.ts';

/** @public */
export { findUnknownSkillTags } from './find-unknown-skill-tags.ts';
export type {
  SkillTagVocabularyEntry,
  SkillTagVocabularyViolation,
} from './find-unknown-skill-tags.ts';

/** @public */
export {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
} from './frontmatter/extract-frontmatter-body.ts';
/** @public */
export { parseYamlFrontmatter } from './frontmatter/parse-yaml-frontmatter.ts';
export type {
  FrontmatterScalar,
  ParsedYamlFrontmatter,
} from './frontmatter/parse-yaml-frontmatter.ts';

/** @public */
export {
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
} from './parse-skill-frontmatter.ts';
export type { ParsedSkillFrontmatter } from './parse-skill-frontmatter.ts';

/** @public */
export {
  parseRuleFrontmatter,
  parseRuleFrontmatterForValidation,
} from './parse-rule-frontmatter.ts';
export type { ParsedRuleFrontmatter } from './parse-rule-frontmatter.ts';

/** @public */
export {
  parsePersonaFrontmatter,
  parsePersonaFrontmatterForValidation,
} from './parse-persona-frontmatter.ts';
export type { ParsedPersonaFrontmatter } from './parse-persona-frontmatter.ts';

/** @public */
export {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.ts';
export type {
  ValidateAgentAssetFrontmatterInput,
  ValidateAgentAssetFrontmatterResult,
  ValidateAgentAssetsResult,
} from './validate-agent-asset-frontmatter.ts';

/** @public */
export {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  mapAgentAssetFileToIngestRecord,
  mapAgentAssetFilesToIngestRecords,
} from './map-agent-assets-for-ingest.ts';
export type {
  AgentAssetIngestRecord,
  AgentAssetPromptType,
} from './map-agent-assets-for-ingest.ts';

/** @public */
export { collectAgentAssetsForIngest } from './collect-agent-assets-for-ingest.ts';
export type { CollectAgentAssetsForIngestResult } from './collect-agent-assets-for-ingest.ts';

/** @public */
export { toProjectSkillInputs } from './project-skill-inputs.ts';
export type { ProjectSkillInput } from './project-skill-inputs.ts';

/** @public */
export {
  resolveSkillAvailability,
  SKILL_AVAILABILITY_ENVIRONMENTS,
} from './resolve-skill-availability.ts';
export type {
  ResolvedSkillAvailability,
  SkillAvailabilityContext,
  SkillAvailabilityEnvironment,
  SkillAvailabilityInput,
  SkillAvailabilityPosture,
  SkillAvailabilityResult,
  SkillAvailabilityRule,
  SkillAvailabilityRuleSet,
} from './resolve-skill-availability.ts';

/** @public */
export { validateAgentAssetsOnDisk } from './validate-agent-assets-on-disk.ts';
export type { WalkAgentAssetsOptions } from './validate-agent-assets-on-disk.ts';

/** @public */
export { walkAgentAssetFiles } from './walk-agent-assets-on-disk.ts';
export type {
  AgentAssetFileEntry,
  WalkAgentAssetFilesResult,
} from './walk-agent-assets-on-disk.ts';
