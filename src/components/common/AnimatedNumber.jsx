import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

import { EASE_OUT } from '../../lib/motion.js';

/** Counts from zero to a numeric value without re-rendering React each frame. */
export default function AnimatedNumber({ value, duration = 0.9, reduce = false }) {
  const target = Number(value) || 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  // The in-app toggle overrides the library's OS-only hook, so both must count.
  const systemReduced = useReducedMotion();
  const reduced = reduce || systemReduced;

  useEffect(() => {
    if (reduced) {
      count.set(target);
      return undefined;
    }

    const controls = animate(count, target, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [count, duration, reduce, reduced, target]);

  return <motion.span>{rounded}</motion.span>;
}
