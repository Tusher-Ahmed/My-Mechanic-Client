// Small, dependency-free charts for the admin dashboard.
// Single-series only (one brand hue) – identity always comes from text labels, never colour,
// so they stay colourblind-safe. Specs: thin marks, 4px rounded data-ends on the baseline,
// recessive grid, hover/focus tooltip, screen-reader table.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "../lib/motion";

const niceMax = (v) => {
  if (v <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

/** Vertical bars for a short time series, e.g. 6 months. data: [{ label, value }] */
export function ColumnChart({ data, format = (n) => n.toLocaleString("en-US"), title, height = 200 }) {
  const [hover, setHover] = useState(null);
  const W = 560;
  const H = height;
  const pad = { top: 12, right: 8, bottom: 28, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, max / 2, max];
  const slot = innerW / data.length;
  const barW = Math.min(36, slot * 0.5);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f6"} strokeWidth="1" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px]">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const h = Math.max(0, innerH - (y(d.value) - pad.top));
          const active = hover === i;
          return (
            <g
              key={d.label}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${format(d.value)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-default outline-none"
            >
              {/* hit target: the whole column, bigger than the mark */}
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={innerH} fill={active ? "#f1f5f9" : "transparent"} rx="6" />
              {h > 0 && (
                <motion.path
                  d={`M${cx - barW / 2},${pad.top + innerH} V${pad.top + innerH - h + 4} Q${cx - barW / 2},${pad.top + innerH - h} ${cx - barW / 2 + 4},${pad.top + innerH - h} H${cx + barW / 2 - 4} Q${cx + barW / 2},${pad.top + innerH - h} ${cx + barW / 2},${pad.top + innerH - h + 4} V${pad.top + innerH} Z`}
                  fill={active ? "#0a7e77" : "#129d92"}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                  transition={{ duration: 0.5, ease, delay: i * 0.05 }}
                />
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className={`text-[11px] ${active ? "fill-ink-900 font-semibold" : "fill-slate-500"}`}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {hover != null && (
          <motion.div
            key={hover}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `${((pad.left + slot * hover + slot / 2) / W) * 100}%` }}
          >
            <span className="text-slate-300">{data[hover].label}</span> <b className="ml-1 tabular-nums">{format(data[hover].value)}</b>
          </motion.div>
        )}
      </AnimatePresence>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bar list – every row labelled, one hue. items: [{ label, value, hint? }] */
export function BarList({ items, format = (n) => n.toLocaleString("en-US"), empty = "No data yet." }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (!items.length || max === 0) return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.label} title={`${it.label}: ${format(it.value)}${it.hint ? ` · ${it.hint}` : ""}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium text-ink-800">
              {it.icon}
              <span className="truncate">{it.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink-900 tabular-nums">
              {format(it.value)}
              {it.hint && <span className="ml-1.5 text-xs font-normal text-slate-400">{it.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${(it.value / max) * 100}%` }}
              transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.05 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
