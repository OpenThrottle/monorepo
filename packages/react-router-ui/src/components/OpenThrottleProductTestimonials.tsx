import * as React from 'react';
// import classnames from 'classnames';

export interface OpenThrottleProductTestimonialsProps {
  // className?: string;
}

export const OpenThrottleProductTestimonials = (
  _props: OpenThrottleProductTestimonialsProps,
): React.ReactElement => {
  // const {  } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const isUsedByTeam = false;
  const copyA = `"I may be partially biased, but OpenThrottle is a game-changer for our team. It has completely transformed how we approach software development."`;
  const copyB = `"I may be partially biased, but OpenThrottle is a game-changer for me. It has completely transformed how I approach software development."`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="my-20 flex flex-col items-center justify-center gap-4">
      <blockquote className="text-foreground/40 mx-auto max-w-3xl leading-relaxed font-normal">
        <p className="text-foreground/40 hover:text-foreground/80 transition-colors">
          {isUsedByTeam ? copyA : copyB}
        </p>
        <footer className="mt-4 text-right text-sm">
          <cite className="block font-medium">~ Matthew Scholta</cite>
          <span className="text-xs">Creator of OpenThrottle</span>
        </footer>
      </blockquote>
    </div>
  );
};
