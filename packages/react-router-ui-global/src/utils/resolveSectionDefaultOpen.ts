/**
 * @description Initial open state of a sidebar section: an explicit per-section
 * value wins, otherwise all sections start open unless
 * `defaultSectionsExpanded` is `false`, in which case only a section holding
 * the active route starts open.
 */
export const resolveSectionDefaultOpen = (
  explicit: boolean | undefined,
  defaultSectionsExpanded: boolean | undefined,
  hasActiveLinkInSection: boolean,
): boolean => {
  if (explicit !== undefined) {
    return explicit;
  }

  if (defaultSectionsExpanded !== false) {
    return true;
  }

  return hasActiveLinkInSection;
};
