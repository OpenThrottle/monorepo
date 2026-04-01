export type TextContent = {
  text: string;
  type: 'text';
};

export type GenericResult<T extends Record<string, unknown>> =
  | {
      content: TextContent[];
      isError: true;
    }
  | {
      content: TextContent[];
      structuredContent: T;
    };
