/**
 * @description Verification badge styling for {@link LinkedArtifactsPanel} —
 * verified reads calm, orphaned warns, unverified is muted (a pending claim).
 * Hoisted out of the component per component-primitive-shape R4.
 */

export const LINKED_ARTIFACT_VERIFICATION_STYLES: Record<string, string> = {
  orphaned: 'border-amber-500/60 bg-amber-500/10',
  unverified: 'border-slate-500/60 bg-slate-500/10',
  verified: 'border-emerald-500/60 bg-emerald-500/10',
};
