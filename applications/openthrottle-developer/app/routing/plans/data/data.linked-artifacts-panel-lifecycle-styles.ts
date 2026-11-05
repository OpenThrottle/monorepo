/**
 * @description Lifecycle badge styling for {@link LinkedArtifactRowItem}.
 *
 * Lifecycle vocabularies come from the server artifact type registry:
 * git_commit `created | landed`, pull_request `open | merged | closed`,
 * deployment `pending | succeeded | failed`, document `draft | published`.
 * A terminal-good state reads green, a failure reads red, and anything still
 * in flight stays muted. Hoisted out of the component per R4.
 */

export const LINKED_ARTIFACT_LIFECYCLE_STYLES: Readonly<
  Record<string, string>
> = {
  closed: 'border-slate-500/60 bg-slate-500/10',
  created: 'border-slate-500/60 bg-slate-500/10',
  draft: 'border-slate-500/60 bg-slate-500/10',
  failed: 'border-red-500/60 bg-red-500/10',
  landed: 'border-emerald-500/60 bg-emerald-500/10',
  merged: 'border-violet-500/60 bg-violet-500/10',
  open: 'border-sky-500/60 bg-sky-500/10',
  pending: 'border-slate-500/60 bg-slate-500/10',
  published: 'border-emerald-500/60 bg-emerald-500/10',
  succeeded: 'border-emerald-500/60 bg-emerald-500/10',
};
