/**
 * @description Resource route: no UI, a placeholder JSON payload until the
 * data layer exists.
 */
export const loader = async (): Promise<Response> => {
  return Response.json({ data: [] });
};
