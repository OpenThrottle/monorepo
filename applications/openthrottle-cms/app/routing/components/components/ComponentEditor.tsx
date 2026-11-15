import { CMS_STATUS } from '@openthrottle/react-router-cms-core';
import {
  Button,
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form, useLocation } from 'react-router';

import type { CmsComponentDetailFragment } from '~/__generated__/graphql';
import { CmsActionFailureAlert } from '~/global/components/CmsActionFailureAlert';
import { formatJson } from '~/global/utils/formatJson';
import { getSignInHref } from '~/routing/auth/utils/auth-redirect';
import { ComponentPropsPreview } from '~/routing/components/components/ComponentPropsPreview';
import { COMPONENT_EDITOR_COPY } from '~/routing/components/data/data.copy';
import type { ComponentActionResult } from '~/routing/components/types/component-action';

export interface ComponentEditorProps {
  readonly className: string | undefined;
  readonly component: CmsComponentDetailFragment;
  /** The route action's last result, if any. */
  readonly result: ComponentActionResult | undefined;
}

/**
 * @description The edit form for one library component: name, typename, status, its source code
 * and the JSON Schema of its props, posted to the route action as one update, beside a live
 * preview of the property form the draft schema produces. Field state is local, so render it
 * keyed by the component uuid to reset it across navigation.
 */
export const ComponentEditor = (
  props: ComponentEditorProps,
): React.ReactElement => {
  const { className, component, result } = props;

  // Hooks
  const location = useLocation();
  const [propsSchemaJson, setPropsSchemaJson] = React.useState(() => {
    return formatJson(component.propsSchemaJson);
  });

  // Setup
  const codeId = `${component.uuid}-code`;
  const failed = result?.ok === false ? result : undefined;
  const nameId = `${component.uuid}-name`;
  const propsSchemaId = `${component.uuid}-props-schema`;
  const signInHref = getSignInHref(`${location.pathname}${location.search}`);
  const statusId = `${component.uuid}-status`;
  const statuses = Object.values(CMS_STATUS);
  const typenameId = `${component.uuid}-typename`;

  // Handlers
  const handlePropsSchemaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    setPropsSchemaJson(event.target.value);
  };

  // Markup
  const failure = failed && (
    <CmsActionFailureAlert
      className={undefined}
      copy={COMPONENT_EDITOR_COPY}
      failure={failed}
      signInHref={signInHref}
    />
  );
  const savedNotice = result?.ok === true && (
    <p className="text-muted-foreground text-sm" role="status">
      {COMPONENT_EDITOR_COPY.saved}
    </p>
  );
  const statusItems = statuses.map((status) => {
    return (
      <SelectItem key={status} value={status}>
        {status}
      </SelectItem>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('grid items-start gap-6 xl:grid-cols-2', className)}
      data-testid="ComponentEditor"
    >
      <Form className="flex flex-col gap-4 rounded-md border p-4" method="post">
        {failure}
        {savedNotice}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>{COMPONENT_EDITOR_COPY.nameLabel}</Label>
            <Input
              defaultValue={component.name}
              id={nameId}
              name="name"
              required={true}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={typenameId}>
              {COMPONENT_EDITOR_COPY.typenameLabel}
            </Label>
            <Input
              defaultValue={component.typename}
              id={typenameId}
              name="typename"
              required={true}
            />
          </div>
          <div className="grid gap-2">
            <Label id={statusId}>{COMPONENT_EDITOR_COPY.statusLabel}</Label>
            <Select
              defaultValue={component.status ?? CMS_STATUS.DRAFT}
              name="status"
            >
              <SelectTrigger aria-labelledby={statusId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{statusItems}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={propsSchemaId}>
            {COMPONENT_EDITOR_COPY.propsSchemaLabel}
          </Label>
          <TextArea
            className="min-h-48 font-mono text-xs"
            id={propsSchemaId}
            name="propsSchemaJson"
            onChange={handlePropsSchemaChange}
            required={true}
            spellCheck={false}
            value={propsSchemaJson}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={codeId}>{COMPONENT_EDITOR_COPY.codeLabel}</Label>
          <TextArea
            className="min-h-64 font-mono text-xs"
            defaultValue={component.code}
            id={codeId}
            name="code"
            required={true}
            spellCheck={false}
          />
        </div>
        <Button className="self-start" type="submit">
          {COMPONENT_EDITOR_COPY.save}
        </Button>
      </Form>
      <ComponentPropsPreview
        className="xl:sticky xl:top-4"
        propsSchemaJson={propsSchemaJson}
        typename={component.typename}
        uuid={component.uuid}
      />
    </div>
  );
};
