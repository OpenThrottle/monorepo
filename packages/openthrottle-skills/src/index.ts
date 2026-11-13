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
} from './tag-actions.ts';
export { evaluateTagActionRules } from './tag-actions.ts';

/** @public */
export type {
  AvailabilityExceptionActionPayload,
  InjectTaskActionPayload,
  PromoteTaskToPlanActionPayload,
  TagActionType,
} from './tag-actions.ts';
export {
  availabilityExceptionActionPayloadSchema,
  injectTaskActionPayloadSchema,
  isTagActionType,
  parseTagActionPayload,
  promoteTaskToPlanActionPayloadSchema,
  TAG_ACTION_TYPES,
} from './tag-actions.ts';

/** @public */
export type {
  SkillTagVocabularyEntry,
  SkillTagVocabularyViolation,
} from './skill-tags.ts';
export { findUnknownSkillTags, mergeSkillTags } from './skill-tags.ts';

/** @public */
export {
  extractContentAfterFrontmatter,
  extractFrontmatterBody,
  parseYamlFrontmatter,
  splitFrontmatter,
} from './frontmatter/frontmatter.ts';
/** @public */
export type {
  FrontmatterScalar,
  ParsedYamlFrontmatter,
  SplitFrontmatterResult,
} from './frontmatter/frontmatter.ts';

/** @public */
export type { SkillsLockEntry, SkillsLockMap } from './parse-skills-lock.ts';
export {
  deriveSkillSourceUrl,
  parseSkillsLockFile,
  SKILLS_LOCK_FILENAME,
} from './parse-skills-lock.ts';

/** @public */
export type {
  ParsedPersonaFrontmatter,
  ParsedSkillFrontmatter,
  ValidateAgentAssetFrontmatterInput,
  ValidateAgentAssetFrontmatterResult,
  ValidateAgentAssetsResult,
} from './agent-asset-frontmatter.ts';
export {
  mergeValidationResults,
  parsePersonaFrontmatter,
  parsePersonaFrontmatterForValidation,
  parseSkillFrontmatter,
  parseSkillFrontmatterForValidation,
  validateAgentAssetFrontmatter,
} from './agent-asset-frontmatter.ts';

/** @public */
export type {
  AgentAssetIngestRecord,
  AgentAssetPromptType,
  CollectAgentAssetsForIngestResult,
  ProjectSkillInput,
} from './agent-assets-ingest.ts';
export {
  AGENT_ASSET_INGEST_PATH_PREFIXES,
  collectAgentAssetsForIngest,
  mapAgentAssetFilesToIngestRecords,
  mapAgentAssetFileToIngestRecord,
  toProjectSkillInputs,
} from './agent-assets-ingest.ts';

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
export type {
  AgentAssetFileEntry,
  WalkAgentAssetFilesResult,
  WalkAgentAssetsOptions,
} from './agent-assets-disk.ts';
export {
  validateAgentAssetsOnDisk,
  walkAgentAssetFiles,
} from './agent-assets-disk.ts';
