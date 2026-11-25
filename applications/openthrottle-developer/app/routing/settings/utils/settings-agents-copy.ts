/** Title of the credential warning alert shown above the agents table. */
export const settingsAgentsAuthWarningTitle = (label: string): string => {
  return `${label}: check which credential is active`;
};

/** Pluralize the compact models summary shown in the table cell. */
export const settingsAgentsModelsSummary = (count: number): string => {
  return count === 1 ? `1 model` : `${count} models`;
};

/** "N of M enabled" hint shown next to the model-expansion affordance. */
export const settingsAgentsModelsEnabledSummary = (
  enabled: number,
  total: number,
): string => {
  return `${enabled} of ${total} enabled`;
};

/** "N of M shown" match count while the expanded model list is filtered. */
export const settingsAgentsModelsShownSummary = (
  shown: number,
  total: number,
): string => {
  return `${shown} of ${total} shown`;
};

/** Enable-all label while a filter narrows the model list, e.g. "Enable 12 shown". */
export const settingsAgentsModelBulkSelectShown = (shown: number): string => {
  return `Enable ${shown} shown`;
};

/** Disable-all label while a filter narrows the model list, e.g. "Disable 12 shown". */
export const settingsAgentsModelBulkDeselectShown = (shown: number): string => {
  return `Disable ${shown} shown`;
};
