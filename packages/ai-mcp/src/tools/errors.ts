/**
 * @description Shared tool error response helpers.
 */

function errorContent(message: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return {
    content: [{ text: message, type: 'text' as const }],
    isError: true,
  };
}

export function configMissingContent(): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent('Cortex Postgres is not configured.');
}

export function configMissingSearchContent(): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;

  return errorContent(message);
}

export function invalidArgsContent(parsedError: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent(`Invalid arguments: ${parsedError}`);
}
