/** Compact X-axis label: MM-DD from YYYY-MM-DD. */
export const formatSkillUsageChartDate = (date: string): string => {
  return date.length >= 10 ? date.slice(5, 10) : date;
};
