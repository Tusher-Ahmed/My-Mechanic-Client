import { forwardRef, useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { Loader2, X } from "lucide-react";
import { dur, ease, easeExit, fadeUp, press } from "../lib/motion";

/* ---------------- Button ---------------- */
const variants = {
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700",
  accent: "bg-accent-400 text-ink-900 shadow-sm shadow-accent-500/30 hover:bg-accent-300",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "border border-slate-200 bg-white text-ink-900 shadow-xs hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-ink-800 hover:bg-slate-100",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const sizes = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-11 gap-2 rounded-xl px-4.5 text-sm",
  lg: "h-13 gap-2.5 rounded-2xl px-6 text-base",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, to, href, className = "", children, disabled, ...props },
  ref
) {
  const cls = `inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 ease-brand disabled:pointer-events-none disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </>
  );
  if (to) {
    return (
      <motion.span whileTap={press} className="inline-flex">
        <Link ref={ref} to={to} className={cls} {...props}>
          {content}
        </Link>
      </motion.span>
    );
  }
  if (href) {
    return (
      <motion.a ref={ref} whileTap={press} href={href} className={cls} {...props}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button ref={ref} whileTap={press} className={cls} disabled={disabled || loading} {...props}>
      {content}
    </motion.button>
  );
});

/* ---------------- Form fields ---------------- */
export const Field = forwardRef(function Field({ label, hint, error, as = "input", className = "", children, ...props }, ref) {
  const id = useId();
  const Comp = as;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children ?? <Comp ref={ref} id={id} className={`input ${as === "textarea" ? "min-h-28 resize-y" : ""}`} aria-invalid={!!error} {...props} />}
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, size = "md", labelledBy }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.querySelector("input,button,textarea,select")?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const width = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size];
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: dur.standard, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: easeExit } }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : title}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${width}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: dur.slow, ease } }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2, ease: easeExit } }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink-900"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Tabs with sliding indicator ---------------- */
export function Tabs({ tabs, value, onChange, id = "tabs", className = "" }) {
  return (
    <div role="tablist" className={`inline-flex gap-1 rounded-2xl bg-slate-100 p-1 ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-150 ${active ? "text-ink-900" : "text-slate-500 hover:text-ink-800"}`}
          >
            {active && (
              <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
              {t.count != null && (
                <span className={`rounded-full px-1.5 text-xs ${active ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-600"}`}>{t.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Status badge ---------------- */
const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};
export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyles[status]}`}>
      <span className={`size-1.5 rounded-full bg-current ${status === "pending" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

/* ---------------- Scroll reveal ---------------- */
export function Reveal({ as = "div", children, className = "", delay = 0, ...props }) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: fadeUp.hidden, show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay } } }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center = true, dark = false }) {
  return (
    <Reveal className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <span className={`eyebrow ${dark ? "border-white/15 bg-white/10 text-brand-200" : ""}`}>{eyebrow}</span>}
      <h2 className={`mt-4 text-3xl font-bold tracking-tight sm:text-4xl ${dark ? "text-white" : ""}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>}
    </Reveal>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function Avatar({ name, className = "size-10 text-sm" }) {
  const letters = (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return <span className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 font-bold text-white ${className}`}>{letters}</span>;
}

/* ---------------- Animated number (counts with a spring) ---------------- */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-US"), className = "" }) {
  const spring = useSpring(0, { stiffness: 120, damping: 22 });
  const text = useTransform(spring, (v) => format(v));
  useEffect(() => {
    spring.set(Number(value) || 0);
  }, [spring, value]);
  return <motion.span className={`tabular-nums ${className}`}>{text}</motion.span>;
}
