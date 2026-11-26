// Mechanical motion building blocks: gears, car, loaders.
// Continuous loops use CSS animations (cheap + disabled by prefers-reduced-motion in index.css).
import { useId } from "react";
import { motion } from "motion/react";

/** SVG path for a gear centred on 0,0 (evenodd fill makes the centre hole). */
export function gearPath(teeth, outer, root, hole) {
  const step = (Math.PI * 2) / teeth;
  const pt = (r, a) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(pt(root, a - step * 0.27), pt(outer, a - step * 0.14), pt(outer, a + step * 0.14), pt(root, a + step * 0.27));
  }
  const ring = `M${hole},0 A${hole},${hole} 0 1 0 ${-hole},0 A${hole},${hole} 0 1 0 ${hole},0 Z`;
  return `M${pts.join(" L")} Z ${ring}`;
}

const spinStyle = (seconds, reverse = false, delay = 0) => ({
  transformBox: "fill-box",
  transformOrigin: "center",
  animation: `${reverse ? "mm-spin-reverse" : "mm-spin"} ${seconds}s linear ${delay}s infinite`,
});

/** A rotating gear. `period` = seconds per turn; meshing gears: period ∝ teeth, opposite direction. */
export function Gear({ x = 0, y = 0, teeth = 12, size = 40, period = 10, reverse = false, offset = 0, className = "" }) {
  const outer = size;
  const root = size * 0.8;
  return (
    <g transform={`translate(${x} ${y}) rotate(${offset})`}>
      <path d={gearPath(teeth, outer, root, size * 0.28)} fillRule="evenodd" className={className} style={spinStyle(period, reverse)} />
    </g>
  );
}

/** Two meshing gears as a loading indicator. */
export function GearLoader({ size = 44, label = "Loading", className = "" }) {
  return (
    <div role="status" aria-label={label} className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <svg width={size * 1.6} height={size} viewBox="-30 -26 92 52" aria-hidden>
        <Gear teeth={10} size={22} period={1.6} className="fill-brand-500" />
        <Gear x={39} y={8} teeth={7} size={15.5} period={1.12} reverse offset={13} className="fill-accent-400" />
      </svg>
      {label && <span className="text-sm font-medium text-slate-500">{label}…</span>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <GearLoader />
    </div>
  );
}

/**
 * Side-view car (faces right). 260 x 110 units.
 * Wheels spin, body has a subtle suspension bounce – reads as "driving".
 */
export function Car({ driving = true, color = "brand", className = "", ...svgProps }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (n) => `${n}-${uid}`;
  const body = color === "accent" ? `url(#${id("car-body-accent")})` : `url(#${id("car-body")})`;
  return (
    <svg viewBox="0 0 268 116" className={className} aria-hidden {...svgProps}>
      <defs>
        <linearGradient id={id("car-body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2bbaac" />
          <stop offset="1" stopColor="#0a7e77" />
        </linearGradient>
        <linearGradient id={id("car-body-accent")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={id("car-glass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.95" />
          <stop offset="1" stopColor="#94a3b8" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* ground shadow – breathes with the bounce */}
      <ellipse cx="134" cy="108" rx="112" ry="6" fill="#000" opacity="0.28">
        {driving && <animate attributeName="rx" values="112;106;112" dur="0.5s" repeatCount="indefinite" />}
      </ellipse>

      <motion.g
        animate={driving ? { y: [0, -1.6, 0] } : { y: 0 }}
        transition={driving ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {/* body */}
        <path
          d="M10,72 Q12,54 30,50 L70,45 Q96,18 132,16 L176,16 Q202,18 222,43 L246,49 Q260,53 260,68 L260,78 Q260,84 252,84 L234,84 A26,26 0 0 0 182,84 L90,84 A26,26 0 0 0 38,84 L18,84 Q10,84 10,76 Z"
          fill={body}
        />
        {/* roof shine */}
        <path d="M100,24 Q120,18 150,18" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* windows */}
        <path d="M82,45 Q102,24 132,22 L151,22 L151,45 Z" fill={`url(#${id("car-glass")})`} />
        <path d="M157,22 L174,22 Q197,24 214,45 L157,45 Z" fill={`url(#${id("car-glass")})`} />
        {/* door line + handles */}
        <path d="M154,47 L154,80" stroke="#000" strokeOpacity="0.15" strokeWidth="1.5" />
        <rect x="132" y="53" width="13" height="3" rx="1.5" fill="#000" opacity="0.2" />
        <rect x="163" y="53" width="13" height="3" rx="1.5" fill="#000" opacity="0.2" />
        {/* lights */}
        <rect x="248" y="55" width="11" height="7" rx="3" fill="#fef3c7" />
        <rect x="11" y="58" width="8" height="8" rx="2.5" fill="#f43f5e" />
        {/* headlight beam */}
        {driving && (
          <path d="M259,58 L300,48 L300,72 Z" fill="#fef3c7" opacity="0.18">
            <animate attributeName="opacity" values="0.12;0.24;0.12" dur="1.6s" repeatCount="indefinite" />
          </path>
        )}
      </motion.g>

      <Wheel cx={64} cy={84} spinning={driving} />
      <Wheel cx={208} cy={84} spinning={driving} />
    </svg>
  );
}

function Wheel({ cx, cy, spinning }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r="22" fill="#0f172a" />
      <circle r="21" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
      <g style={spinning ? spinStyle(0.55) : undefined}>
        <circle r="12" fill="#cbd5e1" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x="-1.6" y="-11" width="3.2" height="11" rx="1.2" fill="#64748b" transform={`rotate(${a})`} />
        ))}
        <circle r="4" fill="#475569" />
      </g>
    </g>
  );
}

/** Wrench that "tightens a bolt": anticipation → turn → settle, then rests. */
export function TighteningWrench({ className = "" }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transformOrigin: "30% 70%" }}
      animate={{ rotate: [0, 8, -32, -28, 0] }}
      transition={{ duration: 1.4, times: [0, 0.12, 0.5, 0.62, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
      aria-hidden
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </motion.svg>
  );
}
