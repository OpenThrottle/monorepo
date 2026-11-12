import type { ProposedPlanDecomposition } from '~/routing/plans/types/document-decompose';

/**
 * @description Build the stub decomposition preview for an uploaded document.
 * Placeholder output until the ingest API is implemented; the shape mirrors what
 * the real parser will return so the preview UI can be wired ahead of it.
 */
export const buildStubProposal = (file: File): ProposedPlanDecomposition => {
  return {
    planDescription: `Stub preview for «${file.name}» (${String(file.size)} bytes). The ingest API will replace this output.`,
    planTitle: `Imported: ${file.name}`,
    tasks: [
      {
        requirements: [
          'Confirm each task matches sections in the source file.',
          'Adjust titles before creating the plan in OpenThrottle.',
        ],
        title: 'Review imported tasks',
      },
      {
        requirements: [
          'Ensure requirement bullets map correctly from the document.',
        ],
        title: 'Validate requirements',
      },
    ],
  };
};
