import { CoreFormRenderer } from '@openthrottle/react-router-cms-core';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import { Provider } from 'jotai';
import * as React from 'react';

import { COMPONENT_PREVIEW_COPY } from '~/routing/components/data/data.copy';
import { toCmsParsedSchema } from '~/routing/fragments/utils/to-cms-records';

export interface ComponentPropsPreviewProps {
  readonly className: string | undefined;
  /** The props schema as typed, saved or not. */
  readonly propsSchemaJson: string;
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @description The fragment property form a props schema produces, rendered read-only by
 * cms-core's `CoreFormRenderer` so an author sees it before any fragment uses the schema. A draft
 * that is not valid JSON, or not a schema object, shows why instead of a form.
 */
export const ComponentPropsPreview = (
  props: ComponentPropsPreviewProps,
): React.ReactElement => {
  const { className, propsSchemaJson, typename, uuid } = props;

  // Hooks

  // Setup
  // Only `json_schema` and `typename` reach the form; the row's other columns are placeholders.
  const schema = toCmsParsedSchema({
    createdAt: undefined,
    jsonSchemaJson: propsSchemaJson,
    status: undefined,
    typename,
    updatedAt: undefined,
    uuid,
    version: 'draft',
  });
  const isEmpty =
    schema.ok &&
    Object.keys(schema.value.json_schema.properties ?? {}).length === 0;

  // Handlers

  // Markup
  const unavailable = !schema.ok && (
    <Alert>
      <AlertTitle>{COMPONENT_PREVIEW_COPY.unavailableTitle}</AlertTitle>
      <AlertDescription>
        {COMPONENT_PREVIEW_COPY[schema.reason]}
      </AlertDescription>
    </Alert>
  );
  const empty = isEmpty && (
    <p className="text-muted-foreground text-sm">
      {COMPONENT_PREVIEW_COPY.empty}
    </p>
  );
  // A disabled fieldset makes every control inert, the renderer's own Save button included, so
  // the preview can never post; its own Jotai store keeps the draft from leaking anywhere.
  const form = schema.ok && !isEmpty && (
    <Provider>
      <fieldset disabled={true}>
        <CoreFormRenderer
          children={undefined}
          className={undefined}
          fragmentUuid={uuid}
          header={null}
          intent="preview"
          issues={undefined}
          schema={schema.value}
        />
      </fieldset>
    </Provider>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={COMPONENT_PREVIEW_COPY.heading}
      className={cn('flex flex-col gap-4 rounded-md border p-4', className)}
      data-testid="ComponentPropsPreview"
    >
      <div>
        <h3 className="text-sm font-bold">{COMPONENT_PREVIEW_COPY.heading}</h3>
        <p className="text-muted-foreground text-sm">
          {COMPONENT_PREVIEW_COPY.description}
        </p>
      </div>
      {unavailable}
      {empty}
      {form}
    </section>
  );
};
