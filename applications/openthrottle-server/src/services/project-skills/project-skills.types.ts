import type {
  SkillOutcomeTelemetry,
  SkillSource,
} from '@openthrottle/openthrottle-skills';

/**
 * A skill as exposed to the availability resolver: slug, static frontmatter
 * tags, and the tri-state static flag (`undefined` when the frontmatter omits
 * `disable-model-invocation`, preserved distinct from an explicit `false`).
 */
export interface ProjectSkillView {
  /** Frontmatter description; `undefined` when the ingested row has none. */
  readonly description: string | undefined;
  /** Set when ingest last found the slug missing from disk. */
  readonly orphanedAt: Date | undefined;
  readonly slug: string;
  readonly source: SkillSource;
  readonly sourceUrl: string | undefined;
  readonly staticDisableModelInvocation: boolean | undefined;
  /**
   * Frontmatter `metadata.outcome-telemetry`: `'none'` when the skill reports
   * no outcome or duration on purpose; `undefined` when it does not opt out.
   */
  readonly staticOutcomeTelemetry: SkillOutcomeTelemetry | undefined;
  readonly tags: readonly string[];
}
