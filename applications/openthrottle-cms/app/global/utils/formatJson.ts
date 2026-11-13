/**
 * @description Pretty-prints a JSON string with two-space indentation. A string that is not valid
 * JSON is returned unchanged so the page still shows what the server sent.
 */
export const formatJson = (json: string): string => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};
