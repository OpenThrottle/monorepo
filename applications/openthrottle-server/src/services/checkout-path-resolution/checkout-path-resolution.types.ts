export interface ResolveCheckoutForPathInput {
  readonly path: string;
  readonly userId: string;
}

export interface ResolvedCheckoutForPath {
  readonly checkoutId: string;
  readonly repositoryId: string;
}
