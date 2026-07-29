import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineErrors } from '@openthrottle/react-router-shadcn';

const ERROR_CLASS_NAME = 'text-destructive mb-2 text-center text-sm';

describe('InlineErrors', () => {
  describe('when every entry is falsy or empty', () => {
    it('renders nothing', () => {
      const component = render(
        <InlineErrors errors={[null, undefined, false, '']} />,
      );

      expect(component.container).toBeEmptyDOMElement();
    });
  });

  describe('when falsy entries are mixed with messages', () => {
    it('omits null, undefined, false, and empty string', () => {
      const component = render(
        <InlineErrors
          errors={[null, 'First', undefined, '', false, 'Second']}
        />,
      );

      const messages =
        component.container.querySelectorAll('p.text-destructive');

      expect(messages).toHaveLength(2);
      expect(messages[0]).toHaveTextContent('First');
      expect(messages[1]).toHaveTextContent('Second');
    });
  });

  describe('when heading is provided and errors remain', () => {
    it('renders the heading above the list', () => {
      const component = render(
        <InlineErrors errors={['Boom']} heading="Something went wrong" />,
      );

      const paragraphs = component.container.querySelectorAll('p');

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toHaveTextContent('Something went wrong');
      expect(paragraphs[0]).not.toHaveClass('text-destructive');
      expect(paragraphs[1]).toHaveTextContent('Boom');
      expect(paragraphs[1]).toHaveClass(...ERROR_CLASS_NAME.split(' '));
    });
  });

  describe('when heading is omitted', () => {
    it('does not render a heading element', () => {
      const component = render(<InlineErrors errors={['Only error']} />);

      const paragraphs = component.container.querySelectorAll('p');

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toHaveTextContent('Only error');
      expect(paragraphs[0]).toHaveClass(...ERROR_CLASS_NAME.split(' '));
    });
  });

  describe('when heading is provided but every entry is filtered out', () => {
    it('renders nothing', () => {
      const component = render(
        <InlineErrors errors={[null, '']} heading="Unused heading" />,
      );

      expect(component.container).toBeEmptyDOMElement();
    });
  });

  describe('when multiple errors remain', () => {
    it('renders each message with destructive inline styling', () => {
      const component = render(
        <InlineErrors errors={['Alpha', 'Beta', 'Gamma']} />,
      );

      const messages =
        component.container.querySelectorAll('p.text-destructive');

      expect(messages).toHaveLength(3);
      expect(messages[0]).toHaveTextContent('Alpha');
      expect(messages[1]).toHaveTextContent('Beta');
      expect(messages[2]).toHaveTextContent('Gamma');

      for (const message of messages) {
        expect(message).toHaveClass(...ERROR_CLASS_NAME.split(' '));
      }
    });
  });
});
