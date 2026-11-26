/**
 * Motion identity for My Mechanic
 * Personality: Corporate (calm, trustworthy – people with a broken car need reassurance)
 *  - signature easing: (0.2, 0, 0, 1) for ~80% of motion
 *  - durations: quick 150ms (buttons) · standard 250ms (cards/lists) · slow 400ms (dialogs/pages)
 *  - entrance: rise 16px + fade, decelerate; exits ~30% faster with accelerate easing
 *  - stagger: 60ms standard, total under 500ms
 * Reduced motion is honoured globally via <MotionConfig reducedMotion="user">.
 */
export const ease = [0.2, 0, 0, 1];
export const easeExit = [0.3, 0, 1, 1];
export const easeEmphasized = [0.05, 0.7, 0.1, 1];

export const dur = { quick: 0.15, standard: 0.25, slow: 0.4 };

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: dur.slow, ease } },
  exit: { opacity: 0, y: 8, transition: { duration: dur.standard * 0.7, ease: easeExit } },
};

export const stagger = (delay = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren } },
});

/** Error shake – firm, no overshoot, ~350ms */
export const shake = {
  x: [0, -10, 10, -6, 6, 0],
  transition: { duration: 0.35, ease: "easeInOut" },
};

/** Button press feedback */
export const press = { scale: 0.97, transition: { duration: dur.quick, ease } };
