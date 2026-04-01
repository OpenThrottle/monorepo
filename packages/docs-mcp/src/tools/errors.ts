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

export function configMissingSearchContent(): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent(
    'Cortex Postgres is not configured. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* (or DOCS_MCP_*) env vars.',
  );
}

export function invalidArgsContent(parsedError: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent(`Invalid arguments: ${parsedError}`);
}
