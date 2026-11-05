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
