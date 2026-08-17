/**
 * @description Single-sourced user-facing copy for the skills routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const SKILLS_EMPTY_COPY = {
  searchTitle: `No skills found, try clearing the search to see all skills.`,
  title: `No skills found, create your first skill to get started.`,
} as const;

/**
 * Copy for the GlobalToolbarSearch control on the skills index toolbar. The
 * control commits to `?search=` and the route filters entries client-side; the
 * label/placeholder live here so specs assert the same constants the UI renders.
 */
export const SKILLS_SEARCH_COPY = {
  ariaLabel: `Search skills`,
  placeholder: `Filter by slug, path, or summary`,
} as const;

/**
 * Copy for the effective-first "Model invocation" column and the skill detail
 * cards. The override indicator marks a skill whose resolved (effective) state
 * diverges from its static frontmatter value.
 */
export const SKILLS_MODEL_INVOCATION_COPY = {
  effectiveLabel: `Effective`,
  overrideIndicatorLabel: `Overridden by rule`,
  overrideTooltip: `Overridden by rule — see details`,
  provenanceLabel: `Provenance`,
  staticLabel: `Static`,
} as const;

/**
 * Copy for the /skills/:slug detail route (read view). The empty-content notice
 * covers a discovered entry whose file could not be read back.
 */
export const SKILL_DETAIL_COPY = {
  backLink: `Back to skills`,
  cancelLabel: `Cancel`,
  editDisabledTooltip: `Editing needs a local checkout — no monorepo root resolved (set WORKSPACE_ROOT), so this deployed view is read-only.`,
  editLabel: `Edit`,
  emptyContentNotice: `The SKILL.md for this skill could not be read from disk.`,
  notFoundStatusText: `Skill not found`,
  pathCopyLabel: `Copy path`,
  saveLabel: `Save`,
  tagsLabel: `Tags`,
} as const;

/**
 * Copy for record-level skill tags (project_skills.tags) and DB-only orphans.
 * Tags are edited against the caller's vocabulary; they are not written to
 * SKILL.md. Orphans stay until an explicit remove.
 */
export const SKILL_RECORD_TAGS_COPY = {
  addLabel: `Add`,
  addTagLabel: `Add a domain tag`,
  emptyTags: `No tags yet`,
  orphanBadge: `Missing from disk`,
  orphanRemoveLabel: `Remove from registry`,
  tagsColumnHeader: `Tags`,
} as const;

/**
 * Copy for the per-skill usage detail card on /skills/:slug (last 30 days,
 * single skill). Formatting helpers live in `data/skill-usage-detail.ts`; the
 * "missing outcomes are normal" hint is reused from the /usage `SKILL_USAGE_COPY`.
 */
export const SKILL_USAGE_DETAIL_COPY = {
  abandonedTile: `Abandoned`,
  avgDurationTile: `Avg duration`,
  backToUsage: `Back to usage`,
  emptyNotice: `No recorded invocations for this skill in the selected window.`,
  errorTile: `Error`,
  heading: `Usage`,
  intro: (rangeDays: number): string =>
    `Harness-captured invocations for this skill over the last ${rangeDays} days.`,
  lastUsedTile: `Last used`,
  outcomeBreakdownHeading: `Outcome breakdown`,
  outcomesTile: `Outcomes reported`,
  overTimeHeading: `Usage over time`,
  scopeTile: `Scope`,
  successRateTile: `Success rate`,
  successTile: `Success`,
  totalTile: `Total invocations`,
  unavailableNotice: `Usage stats couldn't be loaded — this view needs the settings:read permission, or the server was unreachable. The skill content above is unaffected.`,
} as const;

/**
 * Copy for the aggregate usage sections on the /skills index route (all skills,
 * 30-day window). The "Usage over time" + "Top skills" headings and the empty
 * message are shared with the /usage route (SKILL_USAGE_COPY) — only the index
 * section heading, intro, and unavailable notice live here.
 */
export const SKILLS_INDEX_USAGE_COPY = {
  intro: (rangeDays: number): string =>
    `Harness-captured Skill invocations across all skills over the last ${rangeDays} days. Full analytics and filters live on the Usage route.`,
  sectionHeading: `Skill usage`,
  unavailableNotice: `Usage stats couldn't be loaded — this view needs the settings:read permission, or the server was unreachable. The skills list above is unaffected.`,
} as const;

/**
 * Copy for the /skills/:slug "Run skill" modal (interactive stream v1). The run
 * button mirrors the schedule detail Run-now affordance; the modal composes a
 * `/<slug> <args>` invocation and streams the result via the shared chat path.
 */
export const SKILL_RUN_COPY = {
  argumentsHint: `Passed after the slash command as \`/<slug> <arguments>\`. Leave blank to run the skill with no arguments.`,
  argumentsLabel: `Arguments`,
  argumentsPlaceholder: `Optional arguments`,
  cancelLabel: `Cancel`,
  conversationTitle: `Skill run`,
  dialogDescription: `Pick an agent and model, add optional arguments, then run. The result streams live in a conversation.`,
  dialogTitle: `Run skill`,
  followUpPlaceholder: `Send a follow-up…`,
  modelLabel: `Agent & model`,
  noModelsNotice: `No agents or models discovered. Start a local model server or configure an agent CLI, then reopen.`,
  repositoryHint: `Agent CLIs run inside a local checkout. Select the repository to run in.`,
  repositoryLabel: `Repository`,
  runButtonLabel: `Run now`,
  runFailedPrefix: `Couldn't start the skill run:`,
  runLabel: `Run`,
  triggerDisabledTooltip: `This skill is flagged non-invocable, so it can't be run from here.`,
} as const;

/**
 * Copy for the skill write-back action. Every refusal names why the save was
 * rejected without writing; the ingest note reminds that server-side rows
 * (`projectSkills`) refresh on the next agent-asset ingest run, not on save.
 */
export const SKILL_WRITE_COPY = {
  invalidFrontmatterError: `Save rejected — the edited frontmatter no longer validates:`,
  missingContentError: `Save rejected — no content was submitted.`,
  noRootError: `Saving needs a local checkout — no monorepo root resolved (set WORKSPACE_ROOT).`,
  pathEscapeError: `Save rejected — the resolved skill path escapes the repository.`,
  unknownSlugError: `Save rejected — this skill is no longer discoverable on disk.`,
  writeFailedError: `Save failed — the file could not be written to disk.`,
} as const;

/**
 * Copy for the "Source" provenance column and the toolbar source filter. A skill
 * is OpenThrottle-managed only when its frontmatter explicitly claims
 * `source: openthrottle`; everything else (including omitted keys) reads as
 * external, optionally with an origin URL.
 */
export const SKILLS_SOURCE_COPY = {
  columnHeader: `Source`,
  externalLabel: `External`,
  externalTooltip: `Installed from an external source.`,
  externalUrlTooltipPrefix: `Installed from`,
  filterAllLabel: `All`,
  filterExternalLabel: `External`,
  filterGroupLabel: `Filter by source`,
  filterOpenThrottleLabel: `OpenThrottle`,
  openthrottleLabel: `OpenThrottle`,
  openthrottleTooltip: `Authored and managed in this OpenThrottle monorepo.`,
} as const;

/**
 * Copy for the skill-availability authoring surface (posture, rules, vocabulary). All of this
 * concerns model auto-invocation only — human `/skill` invocation is never gated. Rename/remove
 * caveats are deliberately honest: those operations touch the workspace vocabulary alone and never
 * rewrite skill frontmatter or the rules that already reference a tag.
 */
export const SKILL_AVAILABILITY_COPY = {
  manageLink: `Manage availability`,
  pageDescription: `Control which skills a model may auto-invoke, per project and environment. Human /skill invocation is never gated by these rules.`,
  pageTitle: `Skill availability`,
  posture: {
    allowLabel: `Allow (passthrough)`,
    denyLabel: `Deny (default-deny)`,
    heading: `Project posture`,
    passthroughNote: `No rule set for this project — every skill resolves to its own frontmatter value (passthrough). Saving a posture below creates a rule set.`,
    postureAllowNote: `Allow: today's behavior. Every skill stays model-invocable unless a rule below denies it.`,
    postureDenyNote: `Deny: default-deny. No skill is model-invocable unless a rule below explicitly allows it (e.g. only github/terraform in an infra project).`,
    resetConfirmBody: `This deletes the rule set and all its rules, returning the project to passthrough (every skill resolves to its own frontmatter value). This cannot be undone.`,
    resetConfirmTitle: `Reset to passthrough?`,
    resetLabel: `Reset to passthrough`,
    saveLabel: `Save posture`,
  },
  rules: {
    addLabel: `Add rule`,
    emptyNote: `No rules yet. Add a rule to allow or deny skills by tag or slug.`,
    emptySlugError: `Enter at least one tag or slug to allow or deny — an empty rule is not allowed.`,
    environmentAllLabel: `All environments`,
    environmentLabel: `Environment`,
    heading: `Rules`,
    invalidSlugError: `Slugs must be kebab-case (lowercase, hyphen-separated). Fix:`,
    removeLabel: `Remove rule`,
    slugAllowLabel: `Slug allow`,
    slugAllowPlaceholder: `git-commit, pr-review`,
    slugDenyLabel: `Slug deny`,
    slugDenyPlaceholder: `deploy-checklist`,
    slugHelp: `Comma- or space-separated kebab-case skill slugs (one-off exceptions).`,
    tagAllowLabel: `Tag allow`,
    tagDenyLabel: `Tag deny`,
    tagHelp: `Tags are constrained to your workspace vocabulary below.`,
    updateLabel: `Save rule`,
  },
  vocabulary: {
    addLabel: `Add tag`,
    addPlaceholder: `pr-review`,
    caveat: `Renaming or removing a tag changes your workspace vocabulary only. It does NOT rewrite skill frontmatter or update existing rules that reference the tag — those keep the old name and must be updated by hand.`,
    emptyNote: `No tags yet. The 16 platform defaults seed on first read.`,
    heading: `Tag vocabulary`,
    invalidTagError: `Tags must be kebab-case (lowercase, hyphen-separated).`,
    removeLabel: `Remove`,
    renameLabel: `Rename`,
    renamePlaceholder: `new-name`,
    tagColumn: `Tag`,
  },
} as const;

/**
 * Page chrome for the standalone `/skills/vocabulary` route. The tag-manager
 * widget still reads its own strings from `SKILL_AVAILABILITY_COPY.vocabulary`
 * (the two components import that block directly); this const only holds the
 * route-level title/description and the toolbar link that reaches it.
 */
export const SKILL_VOCABULARY_COPY = {
  backLink: `Back to skills`,
  manageLink: `Manage vocabulary`,
  pageDescription: `Add, rename, or remove the workspace tag vocabulary. These tags constrain the tag pickers in the availability rules editor.`,
  pageTitle: `Skill vocabulary`,
} as const;
