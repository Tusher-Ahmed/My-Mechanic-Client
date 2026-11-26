// Animated hero illustration: a car driving through the city towards help,
// meshing gears in the background, a wrench at work and live "app" cards.
// Layers (motion-design skill): primary = car · secondary = floating cards · ambient = gears, skyline parallax, pins.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, MapPin, Star } from "lucide-react";
import { Car, Gear, TighteningWrench } from "./mech";
import { ease, easeEmphasized } from "../lib/motion";

const W = 560; // scene width in SVG units – one skyline period

function Skyline({ y, fill, heights, width = 34, gap = 10, speed }) {
  const blocks = heights.map((h, i) => ({ x: i * (width + gap), h }));
  const copy = (dx) =>
    blocks.map((b, i) => (
      <g key={`${dx}-${i}`}>
        <rect x={b.x + dx} y={y - b.h} width={width} height={b.h} rx="3" fill={fill} />
        {/* lit windows */}
        {b.h > 60 &&
          [0, 1, 2].map((r) => (
            <rect key={r} x={b.x + dx + 8} y={y - b.h + 12 + r * 18} width="6" height="7" rx="1" fill="#fcd34d" opacity={(i + r) % 3 ? 0.08 : 0.55} />
          ))}
      </g>
    ));
  return (
    <g style={{ animation: `scene-scroll ${speed}s linear infinite` }}>
      {copy(0)}
      {copy(W)}
    </g>
  );
}

function RoadDashes() {
  const dashes = Array.from({ length: 18 }, (_, i) => i * 70);
  return (
    <g style={{ animation: "dash-scroll 0.45s linear infinite" }}>
      {dashes.map((x) => (
        <rect key={x} x={x} y="262" width="38" height="4" rx="2" fill="#fcd34d" opacity="0.8" />
      ))}
    </g>
  );
}

function SpeedLines() {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <rect key={i} x="0" y={178 + i * 14} width={40 - i * 8} height="2.5" rx="1.25" fill="#fff" opacity="0">
          <animate attributeName="x" values="150;60" dur="0.7s" begin={`${i * 0.23}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.55;0" dur="0.7s" begin={`${i * 0.23}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}

/** Pops an "Order accepted" toast every few seconds – the story's resolution. */
function useCycle(onMs = 2800, offMs = 2600) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t;
    const loop = (state) => {
      setOn(state);
      t = setTimeout(() => loop(!state), state ? onMs : offMs);
    };
    t = setTimeout(() => loop(true), 1400);
    return () => clearTimeout(t);
  }, [onMs, offMs]);
  return on;
}

export default function HeroScene() {
  const accepted = useCycle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: easeEmphasized, delay: 0.15 }}
      className="relative mx-auto aspect-[5/4] w-full max-w-xl"
    >
      <style>{`
        @keyframes scene-scroll { to { transform: translateX(-${W}px); } }
        @keyframes dash-scroll { to { transform: translateX(-70px); } }
      `}</style>

      {/* scene card */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-ink-900 shadow-2xl shadow-brand-900/30 ring-1 ring-white/10">
        <div className="bg-grid-dark absolute inset-0" />
        <div className="absolute -top-24 -right-16 size-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-accent-500/15 blur-3xl" />

        {/* meshing gears – ambient */}
        <svg viewBox="0 0 200 160" className="absolute -top-6 -right-6 w-[46%] opacity-90" aria-hidden>
          <Gear x={120} y={58} teeth={14} size={48} period={18} className="fill-brand-500/25" />
          <Gear x={52} y={104} teeth={9} size={31} period={11.6} reverse offset={10} className="fill-brand-400/30" />
          <Gear x={160} y={132} teeth={7} size={24} period={9} reverse offset={4} className="fill-accent-400/25" />
        </svg>

        {/* city + road + car */}
        <svg viewBox={`0 0 ${W} 300`} className="absolute inset-x-0 bottom-0 w-full" aria-hidden>
          <Skyline y={236} fill="#13214a" heights={[70, 110, 54, 132, 84, 60, 118, 76, 96, 58, 124, 66]} speed={26} />
          <Skyline y={236} fill="#1f2f61" heights={[40, 64, 30, 52, 72, 36, 58, 44, 62, 34, 50, 46]} width={26} gap={20} speed={12} />
          {/* road */}
          <rect x="0" y="236" width={W} height="64" fill="#0b1328" />
          <rect x="0" y="236" width={W} height="3" fill="#2bbaac" opacity="0.5" />
          <RoadDashes />
          <SpeedLines />
          <Car x="150" y="140" width="268" height="116" />
        </svg>
      </div>

      {/* floating card: mechanic found */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease, delay: 0.55 }}
        className="absolute top-[9%] -left-3 sm:-left-8"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-xl shadow-ink-900/25 ring-1 ring-slate-900/5" style={{ animation: "float-y 5s ease-in-out infinite" }}>
          <span className="relative grid size-10 place-items-center rounded-xl bg-brand-500 text-white">
            <span className="absolute inset-0 animate-ping-slow rounded-xl bg-brand-400/60" />
            <MapPin className="relative size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-900">Mechanic nearby</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              1.2 km away · <Star className="size-3 fill-accent-400 text-accent-400" /> 4.9
            </p>
          </div>
        </div>
      </motion.div>

      {/* floating tile: wrench at work */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease, delay: 0.7 }}
        className="absolute top-[42%] -right-2 hidden sm:block"
      >
        <div className="grid size-16 place-items-center rounded-2xl bg-white text-ink-900 shadow-xl shadow-ink-900/25 ring-1 ring-slate-900/5" style={{ animation: "float-y 6s ease-in-out 1s infinite" }}>
          <TighteningWrench className="size-8 text-brand-600" />
        </div>
      </motion.div>

      {/* resolution: order accepted toast */}
      <div className="absolute right-4 bottom-[34%] left-4 flex justify-center sm:right-auto sm:left-[8%] sm:justify-start">
        <AnimatePresence>
          {accepted && (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.2, ease: [0.3, 0, 1, 1] } }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="flex items-center gap-2.5 rounded-full bg-white py-2 pr-4 pl-2 shadow-xl shadow-ink-900/25"
            >
              <motion.span
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.08 }}
                className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white"
              >
                <CheckCircle2 className="size-4" />
              </motion.span>
              <span className="text-sm font-semibold text-ink-900">Order accepted – help is on the way</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
