/**
 * @description Hardcoded copy for the workspace add-folder onboarding flow.
 * Imported via the settings route components.
 */

import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';
import { KeyRoundIcon } from 'lucide-react';
import { MCP_DEVELOPER_AUTH_DOC_HREF } from '~/routing/settings/utils/settings-docs-links';

export const WORKSPACE_FOLDERS_COPY = {
  addEntryButton: `Add`,
  addFolderButton: `Add folder`,
  addFolderDescription: `Browse the machine running openthrottle-server and add a folder as a workspace checkout. These are folders on the server host, not your browser.`,
  addFolderTitle: `Add a folder`,
  addThisFolder: `Add this folder`,
  addingLabel: `Adding…`,
  advancedPathHint: `Absolute path on the server host. Use this only when the folder is outside your configured workspace roots.`,
  advancedPathToggle: `Enter a server path manually`,
  alreadyRegisteredBadge: `Already added`,
  applyEditorConfigButton: `Apply editor configuration`,
  breadcrumbAriaLabel: `Folder breadcrumb`,
  browseButton: `Browse…`,
  browseEmpty: `No subdirectories here.`,
  browseInAppHint: `Navigate folders on the machine running openthrottle-server, then add the one you want.`,
  browseNativeHint: `Opens a folder chooser on the machine running openthrottle-server.`,
  browseRootsLabel: `Workspace roots`,
  browseTitle: `Browse folders`,
  cloneRepoButton: `Clone repo`,
  cloneRepoDescription: `Clone a git repository onto the machine running openthrottle-server. It is cloned with ambient host credentials (SSH agent / gh) into the configured checkout root — OpenThrottle stores no secrets.`,
  cloneRepoNameLabel: `Folder name (optional)`,
  cloneRepoTitle: `Clone a repository`,
  cloneRepoUrlLabel: `Git URL`,
  detailsButton: `Details`,
  driftBranchMoved: `Branch changed since last scan`,
  driftPathMissing: `Folder is missing on disk`,
  driftRemoteChanged: `Remote changed since last scan`,
  gitRepoBadge: `Git repo`,
  managedBadge: `Managed`,
  manualDisplayNameLabel: `Display name (optional)`,
  manualPathLabel: `Server path`,
  mergedNotice: `This folder turned out to be the same repository as an existing one — it now shares that repository and its project link.`,
  nativePickAgain: `Choose a different folder`,
  nativePickedPrefix: `Selected`,
  pickerLoading: `Loading…`,
  projectCreatedSuffix: `(created)`,
  projectLinkedPrefix: `Linked to project`,
  refreshButton: `Refresh`,
  removeButton: `Remove`,
  sectionDescription: `Repositories are identified by their git remote; each entry below groups your on-disk checkouts on the server host.`,
  upLabel: `Up`,
} as const;

/**
 * @description Copy for Settings → Workspace, which owns editor integration:
 * pick the editors OpenThrottle configures, preview the repositories an apply
 * will write to, run the apply, and read the per-repository result.
 */
export const WORKSPACE_SETTINGS_COPY = {
  applyAllButton: `Apply to all repositories`,
  applyBusyLabel: `Applying…`,
  applyDisabledReason: `Enable at least one editor above to apply configuration.`,
  applyRowButton: `Apply`,
  contactEmailLabel: `Contact email`,
  contactEmailPlaceholder: `you@example.com`,
  contactExplainer: `Used when OpenThrottle writes attribution into generated commits and configuration.`,
  contactLegend: `Contact`,
  displayNameLabel: `Display name`,
  displayNamePlaceholder: `Your name`,
  editorsExplainer: `OpenThrottle can write MCP, skills, and rules into linked repos for the editors you enable.`,
  editorsLabel: `Editors to configure`,
  editorsLegend: `Editor integration`,
  intro: `Choose which editors OpenThrottle configures, then push that configuration into your linked repositories.`,
  profileLegend: `Contact & editors`,
  resultsEmpty: `No linked repositories to update. Add a repository or enable at least one editor.`,
  resultsFilesHeading: `Files written`,
  resultsHeading: `Last apply`,
  resultsNoFiles: `No files written.`,
  resultsWarningsHeading: `Warnings`,
  saveBusyLabel: `Saving…`,
  saveButton: `Save profile`,
  saveEditorsButton: `Save editors`,
  targetsAddRepositoryLink: `Add a repository`,
  targetsColumnActions: `Apply`,
  targetsColumnEditor: `Editor`,
  targetsColumnPath: `Filesystem path`,
  targetsColumnRepository: `Repository`,
  targetsHeading: `Repositories that will be configured`,
  targetsNoEditors: `No editors enabled. Enable at least one editor above to see which repositories will be configured.`,
  targetsNoRepositories: `No linked repositories yet. Add one to configure it for your editors.`,
  title: `Workspace`,
  worktreeRootExplainer: `Where every agent — Claude, Cursor, Ralph, and queued plan runs — creates its git worktrees. Leave blank to use a sibling openthrottle-worktrees directory next to the repository.`,
  worktreeRootHint: `Absolute path, or one starting with ~. Changing it only affects worktrees created from now on.`,
  worktreeRootLabel: `Worktree root`,
  worktreeRootLegend: `Worktrees`,
  worktreeRootPlaceholder: `/Users/you/Development/openthrottle-worktrees`,
  worktreeRootSaveButton: `Save worktree root`,
} as const;

/**
 * @description Copy for the workspace repository details and edit routes.
 */
export const WORKSPACE_REPOSITORY_DETAIL_COPY = {
  agentConfigLabel: `Agent config`,
  backToWorkspace: `Back to Workspace`,
  branchHelp: `The branch runs and checkouts default to.`,
  branchLabel: `Default branch`,
  branchPlaceholder: `e.g. main`,
  cancelButton: `Cancel`,
  checkoutsEmpty: `No checkouts registered for this repository.`,
  checkoutsHeading: `Checkouts`,
  editButton: `Edit`,
  editDescription: `Rename this repository, set its default branch, and link it to an OpenThrottle project. Renaming is display-only and does not touch the git remote.`,
  editTitle: `Edit repository`,
  injectionHelp: `Turns OpenThrottle's curated skills on for this repository. On save, they're layered into your checkouts' .agents/skills and .claude/skills right away (and removed when turned off). Only affects your own checkouts — teammates set this separately.`,
  injectionLabel: `Foreign-skill injection`,
  injectionOff: `Off`,
  injectionOn: `On`,
  injectionStatusLabel: `Skill injection`,
  nameHelp: `A human-readable label. Include the org (e.g. acme/monorepo) to tell repositories with the same name apart.`,
  nameLabel: `Name`,
  namePlaceholder: `e.g. acme/monorepo`,
  noProject: `No project linked`,
  projectLabel: `Linked project`,
  remoteLabel: `Remote`,
  remoteLocalOnly: `Local only (no remote detected)`,
  saveButton: `Save changes`,
  stackLabel: `Stack`,
} as const;

/**
 * @description Copy for the /settings/agents agent-CLI table (columns, empty/loading states, the
 * per-agent enable toggle, compact model list, and the single install-enabled disclaimer).
 */
export const SETTINGS_AGENTS_COPY = {
  columnActions: `Setup`,
  columnAgent: `Agent`,
  columnEnabled: `Enabled`,
  columnModels: `Models`,
  columnStatus: `Status`,
  emptyState: `No agent CLIs to show.`,
  enabledToggleLabel: `Toggle agent`,
  filterAllLabel: `All`,
  filterEnabledLabel: `Enabled`,
  filterInstalledLabel: `Installed`,
  filterLabel: `Show`,
  installDisclaimerOff: `Server-side install/update is disabled. Set OT_AGENT_CLI_INSTALL_ENABLED on the server (local dev machines only) to enable the Install/Update controls.`,
  installDisclaimerOn: `Server-side install/update is enabled (OT_AGENT_CLI_INSTALL_ENABLED). Installs run allowlisted CLIs on the server host.`,
  installedBadge: `Installed`,
  modelBulkDeselect: `Disable all`,
  modelBulkSelect: `Enable all`,
  modelExpandCollapse: `Collapse models`,
  modelExpandExpand: `Expand models`,
  modelFavoriteLabel: `Favorite model`,
  modelToggleLabel: `Toggle model`,
  modelsAgentOffReason: `The agent is disabled. Re-enable it to change its models.`,
  modelsEmpty: `No machine-listable models.`,
  modelsNotInstalled: `—`,
  modelsPopoverTitle: `Models`,
  notInstalledBadge: `Not installed`,
  permissionReason: `Requires the settings:write permission.`,
  toggleDisabledReason: `Requires the settings:write permission.`,
} as const;

/** Pluralize the compact models summary shown in the table cell. */
export const settingsAgentsModelsSummary = (count: number): string =>
  count === 1 ? `1 model` : `${count} models`;

/** "N of M enabled" hint shown next to the model-expansion affordance. */
export const settingsAgentsModelsEnabledSummary = (
  enabled: number,
  total: number,
): string => `${enabled} of ${total} enabled`;

/** Human labels for each setup-table filter value, keyed by the filter id. */
export const SETTINGS_AGENTS_FILTER_LABELS = {
  all: SETTINGS_AGENTS_COPY.filterAllLabel,
  enabled: SETTINGS_AGENTS_COPY.filterEnabledLabel,
  installed: SETTINGS_AGENTS_COPY.filterInstalledLabel,
} as const;

/**
 * @description Copy for the rollout (feature-flagging) settings routes.
 */
export const ROLLOUT_COPY = {
  addVariationButton: `Add variation`,
  allocationLabel: `Allocation`,
  allocationSummaryEmpty: `—`,
  createButton: `New flag`,
  createDescription: `Create a typed feature flag with variations and percentage fallthrough. Role targeting is all-or-nothing before the split.`,
  createTitle: `Create a feature flag`,
  deleteButton: `Delete`,
  deleteConfirm: `Delete this feature flag? This cannot be undone.`,
  descriptionHelp: `Optional. What does this flag gate?`,
  descriptionLabel: `Description`,
  descriptionPlaceholder: `Gates the redesigned dashboard`,
  editButton: `Edit`,
  editDescription: `Update the flag key, type, variations, fallthrough weights, targeting, and state.`,
  editTitle: `Edit feature flag`,
  emptyState: `No feature flags yet. Create one to get started.`,
  enabledHelp: `When off, eligible actors receive the off / default variation.`,
  enabledLabel: `Enabled`,
  fallthroughHelp: `Integer percent weights assigned when the flag is enabled and targeting passes. Weights must sum to 100.`,
  fallthroughIndexError: `Fallthrough points at an unknown variation.`,
  fallthroughLabel: `Fallthrough allocation`,
  fallthroughParseError: `Fallthrough allocation could not be parsed.`,
  fallthroughSumError: `Fallthrough weights must sum to 100.`,
  fallthroughSumStatusPrefix: `Weights total `,
  fallthroughSumStatusSuffix: `% (must be 100).`,
  fallthroughWeightLabel: `Weight %`,
  fallthroughWeightRangeError: `Each weight must be an integer from 0 to 100.`,
  intro: `Rollout is OpenThrottle’s feature-flagging system. Flags are typed (boolean, string, number, json), optionally targeted to RBAC roles, and evaluated server-side with percentage fallthrough.`,
  keyHelp: `Unique, stable identifier used in code (e.g. new-dashboard).`,
  keyLabel: `Key`,
  keyPlaceholder: `new-dashboard`,
  kindHelp: `Value type for every variation on this flag.`,
  kindLabel: `Type`,
  kindRequiredError: `A flag type is required.`,
  offVariationError: `Off variation must be a valid variation index.`,
  offVariationHelp: `Returned when the flag is disabled or the actor fails role targeting.`,
  offVariationLabel: `Off / default variation`,
  removeVariationButton: `Remove`,
  saveButton: `Save changes`,
  sdkHydrationError: `error (using catalog defaults)`,
  sdkHydrationIdle: `idle`,
  sdkHydrationLoading: `loading…`,
  sdkHydrationPrefix: `Client SDK hydration:`,
  sdkHydrationReady: `ready`,
  targetRolesHelp: `Comma-separated RBAC role names (e.g. admin, viewer). Leave blank to enable for everyone.`,
  targetRolesLabel: `Target roles`,
  targetRolesPlaceholder: `admin, viewer`,
  title: `Rollout`,
  variationBooleanInvalid: `Boolean variation must be true or false.`,
  variationDescriptionLabel: `Variation notes`,
  variationDescriptionPlaceholder: `Optional notes`,
  variationIndexPrefix: `Variation `,
  variationJsonInvalid: `JSON variation must be valid JSON.`,
  variationJsonPlaceholder: `{"enabled":true}`,
  variationNameLabel: `Name`,
  variationNamePlaceholder: `control`,
  variationNumberInvalid: `Number variation must be a finite number.`,
  variationShapeError: `Each variation needs a valueJson string`,
  variationStringInvalid: `String variation valueJson must be a JSON string.`,
  variationValueLabel: `Value`,
  variationsHelp: `At least two variations. Values must match the flag type.`,
  variationsLabel: `Variations`,
  variationsMinError: `A flag needs at least two variations.`,
  variationsParseError: `Variations could not be parsed.`,
} as const;

/**
 * @description Copy for Settings → Appearance: the panel intro, every section
 * heading in `APPEARANCE_SECTIONS`, and each control's label and help text.
 * Interpolated values use prefix/suffix pairs so no string is assembled in JSX.
 */
export const APPEARANCE_COPY = {
  brandCustomHelpPrefix: `Custom brand color applied (`,
  brandCustomHelpSuffix: `).`,
  brandDefaultHelpPrefix: `Using theme default (`,
  brandDefaultHelpSuffix: `). Pick a color to override.`,
  brandLabel: `Brand color`,
  brandResetButton: `Use theme default`,
  intro: `Choose how this portal looks. Changes apply immediately and are remembered in this browser.`,
  motionAlwaysLabel: `Reduce motion`,
  motionHelp: `Follow system honors your OS “reduce motion” setting. Reduce motion always turns off decorative background animation, whatever your OS says.`,
  motionLabel: `Motion`,
  motionSystemLabel: `Follow system`,
  motionToggleAriaLabel: `Motion preference`,
  paletteDefaultOptionLabel: `System default`,
  paletteHelp: `Palettes remap the shared design tokens and apply in light, dark, and System mode — a palette follows your OS color scheme when the theme above is set to System. “System default” (no palette) keeps the base theme and your brand color.`,
  paletteLabel: `Theme palette`,
  previewBadge: `Badge`,
  previewBody: `Body text sits on the page background.`,
  previewChartsLabel: `Chart colors`,
  previewDestructiveButton: `Destructive`,
  previewMuted: `Muted text is one step back.`,
  previewOutlineButton: `Outline`,
  previewPrimaryButton: `Primary`,
  previewSidebarLabel: `Sidebar accent`,
  previewTitle: `Preview`,
  resetButton: `Reset appearance`,
  resetConfirmCancel: `Cancel`,
  resetConfirmConfirm: `Reset`,
  resetConfirmDescription: `This clears your theme mode, palette, brand color, and motion preference together.`,
  resetConfirmTitle: `Reset appearance to defaults?`,
  resetHelp: `Returns theme mode, palette, brand color, and motion preference to their defaults.`,
  resetLabel: `Reset to defaults`,
  sectionColorSchemeDescription: `Pick light, dark, or follow your operating system.`,
  sectionColorSchemeTitle: `Color scheme`,
  sectionGuidesDescription: `Bring back dismissed guidance, or start over.`,
  sectionGuidesTitle: `Guides & resets`,
  sectionMotionDescription: `Decorative background animation across the portal.`,
  sectionMotionTitle: `Motion & effects`,
  sectionPaletteDescription: `Swap the whole token palette, or override just the brand color.`,
  sectionPaletteTitle: `Palette`,
  themeHelpPrefix: `Default: `,
  themeHelpSuffix: ` — follows your OS color scheme until you pick Light or Dark.`,
  themeLabel: `Theme`,
  title: `Appearance`,
} as const;

/**
 * @description Copy for Settings → Keys: the header intro that stays on the
 * page. Interpolated values use prefix/suffix pairs so no string is assembled
 * in JSX; `<code>` tokens are their own entries. The operational guidance lives
 * in {@link SETTINGS_KEYS_ONBOARDING}.
 */
export const SETTINGS_KEYS_COPY = {
  introAuthorizationCode: `Authorization`,
  introMiddle: ` format in the `,
  introPrefix: `Long-lived bearer tokens for automation (MCP, Ralph workers, CI). Each credential uses the `,
  introSuffix: ` header.`,
  introTokenCode: `ot_sa_<prefix>_<secret>`,
  title: `Keys`,
} as const;

/**
 * @description Onboarding pitch for Settings → Keys, surfaced through the shared
 * `GlobalFeatureOnboardingModal` (`?modal=onboarding`) from the header trigger.
 * Carries the operational guidance — one-time secret, rotation, human JWT
 * sessions — that used to live in a keys-specific help modal.
 */
export const SETTINGS_KEYS_ONBOARDING: GlobalFeatureOnboardingContent = {
  cta: { label: `Create a credential`, to: `/settings/keys` },
  icon: KeyRoundIcon,
  internalUsage: `Every automation we run authenticates this way: the OT MCP server, the Ralph workers, and CI each hold their own credential, so we can revoke one without taking the rest down.`,
  secondary: {
    label: `MCP and worker authentication (AUTH.md)`,
    to: MCP_DEVELOPER_AUTH_DOC_HREF,
  },
  steps: [
    `Pick the service account the token should act as.`,
    `Create the credential and copy the full token immediately — it is shown once and cannot be retrieved again.`,
    `Paste it into OPENTHROTTLE_MCP_AUTH_TOKEN or your worker env.`,
    `To rotate, create a replacement, update the env, then revoke the old credential from the table.`,
  ],
  tagline: `Long-lived bearer tokens that let MCP servers, Ralph workers, and CI act as a service account — without borrowing a human session.`,
  title: `Keys`,
  useCases: [
    `Authenticate the OT MCP server so agents can read and write plans.`,
    `Give each Ralph worker or CI job its own revocable credential.`,
    `Rotate a leaked or expiring token without downtime.`,
  ],
  whatItIs: `A credential is a service-account bearer token in the form ot_sa_<prefix>_<secret>, sent in the Authorization header. The secret is shown once at creation; revoked or expired credentials stop working at the next request. Human JWT sessions manage these keys in the developer portal — service-account tokens must not call those admin mutations.`,
};
