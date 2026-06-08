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
    <div className="flex flex-col gap-4 justify-center items-center my-20">
      <blockquote className="text-foreground/40 font-normal max-w-3xl leading-relaxed mx-auto">
        <p className="text-foreground/40 hover:text-foreground/80 transition-colors">
          {isUsedByTeam ? copyA : copyB}
        </p>
        <footer className="text-sm mt-4 text-right">
          <cite className="font-medium block">~ Matthew Scholta</cite>
          <span className="text-xs">Creator of OpenThrottle</span>
        </footer>
      </blockquote>
    </div>
  );
};
