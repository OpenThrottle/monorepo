/**
 * @description Endpoint the symbol-details fetch hits; scoped to a repository
 * once one is selected.
 */
export const buildSymbolEndpoint = (selectedId: string | null): string => {
  if (selectedId === null) {
    return '/ide/symbol';
  }
  return `/ide/symbol?repositoryId=${selectedId}`;
};
