/** @public */
export type {
  AgentAssetKind,
  AgentAssetValidationIssue,
  PersonaFrontmatter,
  SkillFrontmatter,
  SkillSource,
} from './schemas/agent-asset-frontmatter.schemas.ts';
export {
  AGENT_ASSET_SLUG_PATTERN,
  personaFrontmatterSchema,
  SKILL_SOURCES,
  skillFrontmatterSchema,
} from './schemas/agent-asset-frontmatter.schemas.ts';

/** @public */
export type {
  DefaultDomainTag,
  DefaultPhaseTag,
  DefaultSkillTag,
  DefaultTagVocabularyEntry,
  SkillTagDimension,
} from './default-skill-tag-vocabulary.ts';
export {
  DEFAULT_DOMAIN_TAG_VOCABULARY,
  DEFAULT_PHASE_TAG_VOCABULARY,
  DEFAULT_SKILL_TAG_VOCABULARY,
  DEFAULT_TAG_VOCABULARY_SEED,
  SYSTEM_TAG_VOCABULARY,
} from './default-skill-tag-vocabulary.ts';

/** @public */
export type {
  DiscoveredSkill,
  DiscoverSkillDirsResult,
} from './discoverSkillDirs.ts';
export { discoverSkillDirs } from './discoverSkillDirs.ts';

/** @public */
export type {
  ForeignSkillLayer,
  ForeignSkillManifestEntry,
  ResolveForeignSkillManifestInput,
  ResolveForeignSkillManifestResult,
} from './resolve-foreign-skill-manifest.ts';
export {
  FOREIGN_SKILL_LAYER,
  resolveForeignSkillManifest,
} from './resolve-foreign-skill-manifest.ts';

/** @public */
export type {
  MatchedTagAction,
  TagActionEvaluationContext,
  TagActionRuleInput,
} from './evaluateTagActionRules.ts';
export { evaluateTagActionRules } from './evaluateTagActionRules.ts';

/** @public */
export type {
  AvailabilityExceptionActionPayload,
  InjectTaskActionPayload,
  PromoteTaskToPlanActionPayload,
  TagActionType,
} from './tag-action-payloads.ts';
export {
  availabilityExceptionActionPayloadSchema,
  injectTaskActionPayloadSchema,
  isTagActionType,
  parseTagActionPayload,
  promoteTaskToPlanActionPayloadSchema,
  TAG_ACTION_TYPES,
} from './tag-action-payloads.ts';

/** @public */
export type {
  SkillTagVocabularyEntry,
  SkillTagVocabularyViolation,
} from './findUnknownSkillTags.ts';
export { findUnknownSkillTags } from './findUnknownSkillTags.ts';

/** @public */
export {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
} from './frontmatter/extract-frontmatter-body.ts';
/** @public */
export type {
  FrontmatterScalar,
  ParsedYamlFrontmatter,
} from './frontmatter/parseYamlFrontmatter.ts';
export { parseYamlFrontmatter } from './frontmatter/parseYamlFrontmatter.ts';
/** @public */
export type { SplitFrontmatterResult } from './frontmatter/splitFrontmatter.ts';
export { splitFrontmatter } from './frontmatter/splitFrontmatter.ts';

/** @public */
export type { SkillsLockEntry, SkillsLockMap } from './parse-skills-lock.ts';
export {
  deriveSkillSourceUrl,
  parseSkillsLockFile,
  SKILLS_LOCK_FILENAME,
} from './parse-skills-lock.ts';

/** @public */
export type { ParsedSkillFrontmatter } from './parse-skill-frontmatter.ts';
export {
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
} from './parse-skill-frontmatter.ts';

/** @public */
export type { ParsedPersonaFrontmatter } from './parse-persona-frontmatter.ts';
export {
  parsePersonaFrontmatter,
  parsePersonaFrontmatterForValidation,
} from './parse-persona-frontmatter.ts';

/** @public */
export type {
  ValidateAgentAssetFrontmatterInput,
  ValidateAgentAssetFrontmatterResult,
  ValidateAgentAssetsResult,
} from './validate-agent-asset-frontmatter.ts';
export {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.ts';

/** @public */
export type {
  AgentAssetIngestRecord,
  AgentAssetPromptType,
} from './map-agent-assets-for-ingest.ts';
export {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  mapAgentAssetFilesToIngestRecords,
  mapAgentAssetFileToIngestRecord,
} from './map-agent-assets-for-ingest.ts';

/** @public */
export type { CollectAgentAssetsForIngestResult } from './collectAgentAssetsForIngest.ts';
export { collectAgentAssetsForIngest } from './collectAgentAssetsForIngest.ts';

/** @public */
export type { ProjectSkillInput } from './toProjectSkillInputs.ts';
export { toProjectSkillInputs } from './toProjectSkillInputs.ts';

/** @public */
export { mergeSkillTags } from './mergeSkillTags.ts';

/** @public */
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
export {
  resolveSkillAvailability,
  SKILL_AVAILABILITY_ENVIRONMENTS,
} from './resolve-skill-availability.ts';

/** @public */
export type { WalkAgentAssetsOptions } from './validateAgentAssetsOnDisk.ts';
export { validateAgentAssetsOnDisk } from './validateAgentAssetsOnDisk.ts';

/** @public */
export type {
  AgentAssetFileEntry,
  WalkAgentAssetFilesResult,
} from './walkAgentAssetFiles.ts';
export { walkAgentAssetFiles } from './walkAgentAssetFiles.ts';
