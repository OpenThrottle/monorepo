/** @description Outcome of one git command; a failure still carries whatever stdout arrived. */
export type GitRunResult =
  | { readonly ok: true; readonly stdout: string }
  | { readonly ok: false; readonly stdout: string };

/** @description What a working-tree file turned out to be. */
export type WorkingFileRead =
  | { readonly kind: 'binary' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'text'; readonly text: string };
