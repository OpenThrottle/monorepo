/**
 * @description Resource route: no UI, a placeholder JSON payload until the
 * data layer exists.
 */
export const loader = async (): Promise<Response> => {
  return Response.json({ data: [] });
};

/**
 * @description Placeholder mutation endpoint for the resource route; delete it
 * if the route only serves reads.
 */
export const action = async (): Promise<Response> => {
  return Response.json({ data: [] });
};
