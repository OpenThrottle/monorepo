/** @public Outcome of validating a client-supplied custom-prompt write target. */
export type ResolveCustomPromptWritePathResult =
  | { readonly absolutePath: string; readonly ok: true }
  | { readonly ok: false; readonly reason: string };
