import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { MAKES, VEHICLE_TYPES, emptyVehicle, vehicleKey, vehicleLabel } from "../data/vehicles";
import { dur, ease } from "../lib/motion";

/* ---------- side-view silhouettes for each car type (64 x 30) ---------- */
const BODY = {
  Sedan: "M4 20 Q5 15 12 14 L20 13 Q26 6 34 6 L42 6 Q48 7 52 13 L58 14 Q61 15 61 19 L61 22 L4 22 Z",
  Hatchback: "M6 20 Q7 15 13 14 L20 13 Q26 5 36 5 L46 5 Q50 6 52 12 L54 14 Q56 15 56 19 L56 22 L6 22 Z",
  "SUV / Jeep": "M4 21 L4 14 Q5 11 10 11 L16 10 L20 3 Q21 2 24 2 L50 2 Q53 2 54 5 L57 11 Q61 12 61 16 L61 22 L4 22 Z",
  "Microbus / Van": "M4 21 L4 8 Q4 2 10 2 L48 2 Q53 2 56 8 L60 14 Q61 16 61 18 L61 22 L4 22 Z",
  Pickup: "M3 21 L3 13 L30 13 L30 5 Q31 3 34 3 L44 3 Q47 3 49 7 L52 12 Q60 13 61 17 L61 22 L3 22 Z",
};
const WHEELS = { Sedan: [16, 50], Hatchback: [17, 46], "SUV / Jeep": [16, 50], "Microbus / Van": [16, 50], Pickup: [14, 50] };

export function CarTypeIcon({ type, className = "h-7 w-16" }) {
  return (
    <svg viewBox="0 0 64 30" className={className} aria-hidden>
      <path d={BODY[type] ?? BODY.Sedan} fill="currentColor" />
      {(WHEELS[type] ?? WHEELS.Sedan).map((x) => (
        <g key={x}>
          <circle cx={x} cy="22" r="5.5" fill="#0f172a" />
          <circle cx={x} cy="22" r="2.2" fill="#cbd5e1" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Compact, overflow-safe display of the car types a garage services.
 *  - every known type → one "All car types" badge
 *  - otherwise the first `max` chips + "+N more" that expands inline
 * Chips wrap and truncate, so any number / length of types keeps the layout intact.
 */
export function VehicleTypeBadges({ types = [], max = 3, tone = "light", size = "sm", expandable = true }) {
  const [expanded, setExpanded] = useState(false);
  const unique = [...new Set(types)];
  if (unique.length === 0) return null;

  const coversAll = VEHICLE_TYPES.every((t) => unique.includes(t));
  const chip =
    tone === "dark"
      ? "bg-white/10 text-white ring-1 ring-white/10"
      : "bg-white text-slate-600 ring-1 ring-slate-200";
  const icon = tone === "dark" ? "text-brand-300" : "text-brand-600";
  const text = size === "xs" ? "text-[11px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";
  const iconSize = size === "xs" ? "h-3 w-7" : "h-3.5 w-8";

  if (coversAll) {
    return (
      <span className={`inline-flex max-w-full items-center rounded-full font-semibold ${chip} ${text}`} data-testid="vehicle-types" title={unique.join(", ")}>
        <span className="flex -space-x-3">
          {VEHICLE_TYPES.slice(0, 3).map((t) => (
            <CarTypeIcon key={t} type={t} className={`${iconSize} ${icon}`} />
          ))}
        </span>
        All car types
      </span>
    );
  }

  const shown = expanded ? unique : unique.slice(0, max);
  const hidden = unique.length - shown.length;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid="vehicle-types">
      <AnimatePresence initial={false}>
        {shown.map((t) => (
          <motion.span
            key={t}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: dur.quick }}
            className={`inline-flex max-w-[12rem] min-w-0 items-center rounded-full font-semibold ${chip} ${text}`}
            title={t}
          >
            <CarTypeIcon type={t} className={`${iconSize} shrink-0 ${icon}`} />
            <span className="truncate">{t}</span>
          </motion.span>
        ))}
      </AnimatePresence>
      {!expandable && hidden > 0 && <span className={`font-semibold text-slate-400 ${text}`}>+{hidden}</span>}
      {expandable && (hidden > 0 || expanded) && unique.length > max && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          className={`rounded-full font-semibold underline-offset-2 hover:underline ${tone === "dark" ? "text-brand-200" : "text-brand-700"} ${text}`}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </span>
  );
}

/** Pick one or several car types (used for the map filter and for mechanics' "we service" list). */
export function CarTypeChooser({ value, onChange, multiple = false, allowAll = false, size = "md" }) {
  const selected = multiple ? value : [value];
  const toggle = (t) => {
    if (!multiple) return onChange(t);
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  };
  const pad = size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2.5";
  return (
    <div className="flex flex-wrap gap-2" role={multiple ? "group" : "radiogroup"}>
      {allowAll && (
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          onClick={() => onChange("")}
          className={`rounded-xl text-sm font-semibold transition-colors duration-150 ${pad} ${!value ? "bg-ink-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
        >
          All cars
        </button>
      )}
      {VEHICLE_TYPES.map((t) => {
        const on = selected.includes(t);
        return (
          <motion.button
            key={t}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            whileTap={{ scale: 0.96 }}
            onClick={() => toggle(t)}
            className={`flex items-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${pad} ${on ? "bg-brand-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
          >
            <CarTypeIcon type={t} className={size === "sm" ? "h-4 w-9" : "h-5 w-11"} />
            {t}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Make / model / type / year / plate form. */
export function VehicleForm({ value, onChange, idPrefix }) {
  const uid = useId();
  const id = (n) => `${idPrefix ?? uid}-${n}`;
  const set = (k, v) => onChange({ ...value, [k]: v });
  const models = MAKES[Object.keys(MAKES).find((m) => m.toLowerCase() === value.make.trim().toLowerCase())] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <span className="label">Car type</span>
        <CarTypeChooser value={value.type} onChange={(t) => set("type", t)} size="sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={id("make")}>Make</label>
          <input id={id("make")} className="input" list={id("makes")} placeholder="e.g. Toyota" value={value.make} onChange={(e) => set("make", e.target.value)} autoComplete="off" />
          <datalist id={id("makes")}>
            {Object.keys(MAKES).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor={id("model")}>Model</label>
          <input id={id("model")} className="input" list={id("models")} placeholder={models[0] ? `e.g. ${models[0]}` : "e.g. Axio"} value={value.model} onChange={(e) => set("model", e.target.value)} autoComplete="off" />
          <datalist id={id("models")}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor={id("year")}>Year <span className="font-normal text-slate-400">(optional)</span></label>
          <input id={id("year")} className="input" type="number" inputMode="numeric" min="1960" max={new Date().getFullYear() + 1} placeholder="e.g. 2016" value={value.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={id("plate")}>Number plate <span className="font-normal text-slate-400">(optional)</span></label>
          <input id={id("plate")} className="input uppercase placeholder:normal-case" placeholder="e.g. Dhaka Metro-Ga 12-3456" value={value.plate} onChange={(e) => set("plate", e.target.value)} maxLength={24} />
        </div>
      </div>
    </div>
  );
}

export const isVehicleComplete = (v) => !!(v && v.type && v.make.trim() && v.model.trim());

/** Normalise form values for the API (numbers, trimmed strings, empty optional fields removed). */
export function cleanVehicle(v) {
  const out = { type: v.type, make: v.make.trim(), model: v.model.trim() };
  if (v.year !== "" && v.year != null) out.year = Number(v.year);
  if (v.plate?.trim()) out.plate = v.plate.trim();
  return out;
}

/**
 * Booking step: choose a saved car or enter a new one.
 * value = { vehicle, save } ; onChange receives the same shape.
 */
export default function VehiclePicker({ saved = [], value, onChange }) {
  const [mode, setMode] = useState(saved.length ? vehicleKey(saved[0]) : "new");
  const pickSaved = (v) => {
    setMode(vehicleKey(v));
    onChange({ vehicle: { ...emptyVehicle, ...v, year: v.year ?? "", plate: v.plate ?? "" }, save: false });
  };
  const pickNew = () => {
    setMode("new");
    onChange({ vehicle: { ...emptyVehicle }, save: true });
  };

  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {saved.map((v) => {
            const on = mode === vehicleKey(v);
            return (
              <button
                key={vehicleKey(v)}
                type="button"
                onClick={() => pickSaved(v)}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${on ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <span className={on ? "text-brand-600" : "text-slate-400"}>
                  <CarTypeIcon type={v.type} className="h-6 w-14" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {v.make} {v.model}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{[v.type, v.year, v.plate].filter(Boolean).join(" · ")}</span>
                </span>
                {on && <Check className="size-4 shrink-0 text-brand-600" strokeWidth={3} />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={pickNew}
            aria-pressed={mode === "new"}
            className={`flex items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-sm font-semibold transition-colors ${mode === "new" ? "border-brand-500 bg-brand-50/70 text-brand-700" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}
          >
            <Plus className="size-4" /> Another car
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {mode === "new" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: { duration: dur.standard, ease } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <VehicleForm value={value.vehicle} onChange={(vehicle) => onChange({ ...value, vehicle })} idPrefix="book" />
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="size-4 rounded accent-brand-600" checked={value.save} onChange={(e) => onChange({ ...value, save: e.target.checked })} />
              Save this car to my profile for next time
            </label>
          </motion.div>
        )}
      </AnimatePresence>
      {mode !== "new" && value.vehicle && <p className="sr-only">Selected: {vehicleLabel(value.vehicle)}</p>}
    </div>
  );
}
