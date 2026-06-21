import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';
import { motion } from 'framer-motion';

export interface OpenThrottleEntranceProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * @description Lightweight entrance animation (fade + slight upward slide) for page sections or hero copy.
 */
export const OpenThrottleEntrance = (
  props: OpenThrottleEntranceProps,
): React.ReactElement => {
  const { children, className } = props;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(className)}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
