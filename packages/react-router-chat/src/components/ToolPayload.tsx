import * as React from 'react';
import { Markdown, ScrollArea } from '@openthrottle/react-router-shadcn';

export interface ToolPayloadProps {
  readonly content: string;
  readonly label: string;
}

/** One labeled, scroll-bounded JSON payload section (args or result). */
export const ToolPayload = (props: ToolPayloadProps): React.ReactElement => {
  const { content, label } = props;

  // Markup
  return (
    <section className="space-y-1">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <ScrollArea className="max-h-48 rounded border">
        <Markdown
          className="text-xs break-words [&_pre]:whitespace-pre-wrap"
          content={content}
        />
      </ScrollArea>
    </section>
  );
};
