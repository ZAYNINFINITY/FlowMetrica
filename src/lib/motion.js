// Shared motion primitives. Springs settle like physical objects instead of
// sliding linearly, so the same language reads across every page transition.
export const EASE_OUT = [0.22, 1, 0.36, 1];

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageOptions = { duration: 0.24, ease: EASE_OUT };

// Parent owns the rhythm; children only declare how they enter.
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 27, mass: 0.9 },
  },
};

export const pressable = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 420, damping: 26 },
};
