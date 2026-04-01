import { z } from 'zod';

export const schemaMetadataTags = z
  .object({
    owners: z
      .array(z.string())
      .default([])
      .describe('The name of any owners mentioned in the document'),
    projects: z
      .array(z.string())
      .default([])
      .describe('The name of any projects mentioned in the document'),
    technologies: z
      .array(z.string())
      .default([])
      .describe('The name of any technologies mentioned in the document'),
  })
  .describe('Tags that have been extracted from the document.');

export const schemaMetadata = z.object({
  extension: z.string().describe('The extension of the document.'),
  source: z.string().describe('The source of the document on this machine.'),
  tagging: schemaMetadataTags,
  type: z.string().describe('The type of the document.'),
});
