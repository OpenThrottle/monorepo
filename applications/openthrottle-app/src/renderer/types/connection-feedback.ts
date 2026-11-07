export type ConnectionFeedback =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'idle' }
  | { readonly kind: 'success'; readonly message: string };
