import { Button, cn } from '@openthrottle/react-router-shadcn';
import { FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { useAtomValue } from 'jotai';
import * as React from 'react';
import { Form } from 'react-router';

import { atomFragmentDraft } from '../data/data.atom.fragment-draft';
import { CORE_FORM_COPY } from '../data/data.copy';
import { CoreFormContext } from '../data/data.core-form-context';
import { FORM_FIELDS } from '../data/data.form-fields';
import type { CmsParsedSchema } from '../types/cms-json-schema';
import type { CmsFormChildren, CmsFormContextValue } from '../types/cms-render';
import { getFormFieldKind } from '../utils/form-field-kind';
import { FormAccordion } from './FormAccordion';
import { FormAccordionPane } from './FormAccordionPane';
import { FormChildren } from './FormChildren';

/**
 * @public
 */
export interface CoreFormRendererProps {
  /** The `children` field's props; without them a `children` property renders no field. */
  readonly children: CmsFormChildren | undefined;
  readonly className: string | undefined;
  readonly fragmentUuid: string;
  /** Posted as `intent`, so the route action can tell this submit from others. */
  readonly intent: string;
  readonly schema: CmsParsedSchema;
}

/**
 * @description The edit form for one fragment: a field per schema property, each in an accordion
 * pane, editing the fragment draft. Submitting posts the draft as JSON in `properties`, alongside
 * `intent`, `fragment_uuid` and `typename`.
 * @public
 */
export const CoreFormRenderer = (
  props: CoreFormRendererProps,
): React.ReactElement => {
  const { children, className, fragmentUuid, intent, schema } = props;

  // Hooks
  const draft = useAtomValue(atomFragmentDraft);

  // Setup
  const jsonSchema = schema.json_schema;
  const keys = Object.keys(jsonSchema.properties ?? {});
  const context: CmsFormContextValue = { fragmentUuid, schema };

  // Handlers

  // Markup
  const renderField = (key: string): React.ReactNode => {
    const kind = getFormFieldKind(key, jsonSchema);

    if (kind === 'none') return null;

    if (kind === 'children') {
      return children && <FormChildren {...children} className={undefined} />;
    }

    const Field = FORM_FIELDS[kind];

    return (
      <Field
        className={undefined}
        disabled={false}
        hideLabel={true}
        name={key}
        schema={schema}
      />
    );
  };

  const panes = keys.map((key) => {
    return (
      <FormAccordionPane
        className={undefined}
        key={key}
        label={key}
        required={jsonSchema.required?.includes(key) ?? false}
      >
        {renderField(key)}
      </FormAccordionPane>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CoreFormContext.Provider value={context}>
      <Form className={cn('flex h-full flex-col', className)} method="post">
        <input name="intent" type="hidden" value={intent} />
        <input name="fragment_uuid" type="hidden" value={fragmentUuid} />
        <input name="properties" type="hidden" value={JSON.stringify(draft)} />
        <input name="typename" type="hidden" value={schema.typename} />

        <FormAccordion className={undefined} defaultOpen={keys[0]}>
          {panes}
        </FormAccordion>

        <div className="flex-1" />

        <div className="m-4 flex gap-4">
          <Button className="flex-1" type="submit">
            <FloppyDiskIcon />
            {CORE_FORM_COPY.save}
          </Button>
        </div>
      </Form>
    </CoreFormContext.Provider>
  );
};
