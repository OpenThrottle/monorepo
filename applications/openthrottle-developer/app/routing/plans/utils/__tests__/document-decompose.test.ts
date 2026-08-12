import { describe, expect, test } from 'vitest';
import { buildStubProposal } from '../document-decompose';

describe('routing/plans/utils/document-decompose', () => {
  describe('buildStubProposal', () => {
    test('derives title/description from the file and returns the two stub tasks', () => {
      const file = new File(['abc'], 'requirements.md');
      const proposal = buildStubProposal(file);

      expect(proposal.planTitle).toBe('Imported: requirements.md');
      expect(proposal.planDescription).toContain('requirements.md');
      expect(proposal.tasks.map((task) => task.title)).toEqual([
        'Review imported tasks',
        'Validate requirements',
      ]);
    });
  });
});
