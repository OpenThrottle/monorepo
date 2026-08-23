import * as React from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@openthrottle/react-router-shadcn';
import type { SkillArgument } from '@openthrottle/openthrottle-skills';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import type { SkillArgumentValue } from '~/routing/skills/utils/compose-skill-invocation-args';

export interface RunSkillArgumentFieldProps {
  readonly declaration: SkillArgument;
  readonly onChange: (value: SkillArgumentValue) => void;
  readonly value: SkillArgumentValue;
}

/**
 * @description A single typed control for a declared skill argument, chosen by
 * the argument's `type`: `text`/`number` → {@link Input}, `boolean` →
 * {@link Switch}, `enum` → {@link Select}. Labels use the argument name (with a
 * required marker) and its optional `description` as a hint. Presentational —
 * value + onChange are owned by {@link useRunSkillDialog}.
 */
export const RunSkillArgumentField = (
  props: RunSkillArgumentFieldProps,
): React.ReactElement => {
  const { declaration, onChange, value } = props;

  // Hooks

  // Setup
  const fieldId = `run-skill-arg-${declaration.name}`;
  const stringValue = typeof value === 'string' ? value : '';

  // Handlers

  // Markup
  const label = (
    <Label htmlFor={fieldId}>
      {declaration.name}
      {declaration.required ? (
        <span aria-hidden={true} className="text-destructive">
          {' '}
          {SKILL_RUN_COPY.requiredMarker}
        </span>
      ) : null}
    </Label>
  );

  const hint = declaration.description ? (
    <p className="text-muted-foreground text-xs">{declaration.description}</p>
  ) : null;

  // Life Cycle

  // 🔌 Short Circuit
  if (declaration.type === 'boolean') {
    return (
      <div className="flex flex-col gap-1.5" data-testid={fieldId}>
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true}
            id={fieldId}
            onCheckedChange={(checked) => onChange(checked)}
          />
          {label}
        </div>
        {hint}
      </div>
    );
  }

  if (declaration.type === 'enum') {
    return (
      <div className="flex flex-col gap-1.5" data-testid={fieldId}>
        {label}
        <Select onValueChange={onChange} value={stringValue}>
          <SelectTrigger aria-label={declaration.name} id={fieldId}>
            <SelectValue placeholder={SKILL_RUN_COPY.enumPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {(declaration.enum ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hint}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid={fieldId}>
      {label}
      <Input
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        type={declaration.type === 'number' ? 'number' : 'text'}
        value={stringValue}
      />
      {hint}
    </div>
  );
};
