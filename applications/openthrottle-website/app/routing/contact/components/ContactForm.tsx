import * as React from 'react';
import classnames from 'classnames';
import { Form } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';

interface ContactFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
}

export const ContactForm = (props: ContactFormProps): React.ReactElement => {
  const { actionData, className } = props;
  const error = actionData?.error;

  return (
    <Card className={classnames('w-full', className)} data-testid="ContactForm">
      <CardContent>
        <Form className="w-full space-y-4 pt-8" method="post">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              placeholder="you@example.com"
              required={true}
              type="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              name="name"
              placeholder="Your name"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <TextArea
              id="contact-message"
              name="message"
              placeholder="Your message"
              required={true}
              rows={4}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex gap-3 p-0 pt-4">
            <Button type="submit">Submit</Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
