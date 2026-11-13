/**
 * @description The library detail URL for a component's owning library.
 */
export const getLibraryHref = (libraryUuid: string): string => {
  return `/libraries/${libraryUuid}`;
};
