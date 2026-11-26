import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
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

/**
 * Searchable car-type dropdown (combobox). Replaces chip rows so any number of types fits on one line.
 *  - single:   value = "Sedan" | ""          (allowAll adds an "All cars" option = "")
 *  - multiple: value = ["Sedan", ...]        (checkboxes, Select all / Clear)
 * Rendered in a portal with fixed positioning, so cards/drawers with overflow never clip it.
 */
export function CarTypeChooser({ value, onChange, multiple = false, allowAll = false, size = "md", placeholder = "Choose car type", label, ariaLabel = "Car type", id: idProp }) {
  const uid = useId();
  const id = idProp ?? `cartype-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const selected = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const options = [...(allowAll && !multiple ? [""] : []), ...VEHICLE_TYPES];
  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => (o === "" ? "all cars" : o.toLowerCase()).includes(q));

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 256);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < 320 && r.top > spaceBelow;
    setPos({ left, width, ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }), up });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    setActive(0);
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  const close = () => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };
  const choose = (o) => {
    if (multiple) {
      onChange(selected.includes(o) ? selected.filter((x) => x !== o) : VEHICLE_TYPES.filter((t) => t === o || selected.includes(t)));
    } else {
      onChange(o);
      close();
    }
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active] !== undefined) choose(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const coversAll = multiple && VEHICLE_TYPES.every((t) => selected.includes(t));
  const summary = multiple
    ? selected.length === 0
      ? null
      : coversAll
        ? "All car types"
        : selected.length <= 2
          ? selected.join(", ")
          : `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`
    : value
      ? value
      : allowAll
        ? "All cars"
        : null;
  const h = size === "sm" ? "h-10 text-sm" : "h-11 text-sm";

  return (
    <div className="relative min-w-0">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label ? undefined : ariaLabel}
        aria-controls={`${id}-list`}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`input flex w-full min-w-0 items-center gap-2.5 text-left ${h} ${open ? "border-brand-500 ring-4 ring-brand-500/15" : ""}`}
      >
        {summary ? (
          <>
            {!multiple && value && <CarTypeIcon type={value} className="h-4 w-9 shrink-0 text-brand-600" />}
            {multiple && (
              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700 tabular-nums">{selected.length}</span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{summary}</span>
          </>
        ) : (
          <span className="flex-1 truncate text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: dur.standard, ease } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 70 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
            >
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKey}
                  placeholder="Search car type…"
                  aria-label="Search car type"
                  aria-controls={`${id}-list`}
                  aria-activedescendant={filtered[active] !== undefined ? `${id}-opt-${active}` : undefined}
                  className="h-10 w-full rounded-xl bg-slate-50 pr-3 pl-9 text-sm text-ink-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <ul id={`${id}-list`} role="listbox" aria-multiselectable={multiple || undefined} className="max-h-64 overflow-y-auto p-1.5">
                {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No car type matches “{query}”</li>}
                {filtered.map((o, i) => {
                  const on = o === "" ? !value : selected.includes(o);
                  return (
                    <li
                      key={o || "all"}
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={on}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${i === active ? "bg-slate-100" : ""} ${on ? "font-semibold text-ink-900" : "text-slate-700"}`}
                    >
                      {multiple ? (
                        <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"}`}>
                          {on && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                      ) : null}
                      {o === "" ? (
                        <span className="grid h-4 w-9 shrink-0 place-items-center text-[10px] font-bold text-slate-400">ALL</span>
                      ) : (
                        <CarTypeIcon type={o} className={`h-4 w-9 shrink-0 ${on ? "text-brand-600" : "text-slate-400"}`} />
                      )}
                      <span className="min-w-0 flex-1 truncate">{o === "" ? "All cars" : o}</span>
                      {!multiple && on && <Check className="size-4 shrink-0 text-brand-600" strokeWidth={3} />}
                    </li>
                  );
                })}
              </ul>
              {multiple && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onChange([...VEHICLE_TYPES])} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                      Select all
                    </button>
                    <button type="button" onClick={() => onChange([])} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                      Clear
                    </button>
                  </div>
                  <button type="button" onClick={close} className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800">
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
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
      <div className="sm:max-w-xs">
        <CarTypeChooser label="Car type" id={id("type")} value={value.type} onChange={(t) => set("type", t)} />
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
