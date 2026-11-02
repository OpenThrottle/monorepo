/**
 * Static copy and formatting for {@link ChatUsageLimitNotice}. Kept out of the
 * component per the repo's component/data split.
 * @public
 */
export const CHAT_USAGE_LIMIT_COPY = {
  limitReached: 'Usage limit reached',
  resetsPrefix: 'resets',
} as const;

/**
 * Human line for a usage-limit event: "Usage limit reached — resets <local
 * time>", or just "Usage limit reached" when the reset time is null or not a
 * parseable date. The time renders in the viewer's locale and timezone.
 * @public
 */
export const formatUsageLimitMessage = (resetsAt: string | null): string => {
  if (resetsAt === null) {
    return CHAT_USAGE_LIMIT_COPY.limitReached;
  }

  const date = new Date(resetsAt);
  if (Number.isNaN(date.getTime())) {
    return CHAT_USAGE_LIMIT_COPY.limitReached;
  }

  const time = date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });

  return `${CHAT_USAGE_LIMIT_COPY.limitReached} — ${CHAT_USAGE_LIMIT_COPY.resetsPrefix} ${time}`;
};
