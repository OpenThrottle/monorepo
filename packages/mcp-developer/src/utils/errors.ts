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

export function invalidArgsContent(parsedError: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent(`Invalid arguments: ${parsedError}`);
}
