import { useAtom } from 'jotai';

import { atomFragmentDraft } from '../data/data.atom.fragment-draft';
import type { CmsJsonSchema, CmsParsedSchema } from '../types/cms-json-schema';

/**
 * @public
 */
export interface UseFormFieldOptions {
  /** The property name, which is also the field's label and input name. */
  readonly label: string;
  readonly schema: CmsParsedSchema;
}

/**
 * @public
 */
export interface UseFormFieldResult {
  readonly description: string | undefined;
  readonly isRequired: boolean;
  readonly property: CmsJsonSchema | undefined;
  readonly setValue: (value: unknown) => void;
  /** The property's value in the draft, still untyped stored JSON. */
  readonly value: unknown;
}

/**
 * @description Binds one schema property to the fragment draft: its current value, a setter that
 * writes it back, and what the schema says about it.
 * @public
 */
export const useFormField = (
  options: UseFormFieldOptions,
): UseFormFieldResult => {
  const { label, schema } = options;

  // Hooks
  const [draft, setDraft] = useAtom(atomFragmentDraft);

  // Setup
  const jsonSchema = schema.json_schema;
  const property = jsonSchema.properties?.[label];
  const isRequired = jsonSchema.required?.includes(label) ?? false;

  // Handlers
  const setValue = (value: unknown): void => {
    setDraft((current) => {
      return { ...current, [label]: value };
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    description: property?.description,
    isRequired,
    property,
    setValue,
    value: draft[label],
  };
};
