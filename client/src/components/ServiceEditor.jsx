import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "./ui";
import { money } from "../lib/format";
import { dur, ease } from "../lib/motion";

const SUGGESTIONS = ["Engine diagnosis", "Oil change", "Brake repair", "Battery jump-start", "Tyre change", "AC service", "Wheel alignment", "Towing"];

/** Edit a list of { serviceName, price } */
export default function ServiceEditor({ value, onChange }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const add = (e) => {
    e?.preventDefault();
    const n = name.trim();
    const p = Number(price);
    if (!n || !(p >= 0) || price === "") return;
    onChange([...value, { serviceName: n, price: p }]);
    setName("");
    setPrice("");
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const unused = SUGGESTIONS.filter((s) => !value.some((v) => v.serviceName.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {value.map((s, i) => (
            <motion.li
              key={s._id ?? `${s.serviceName}-${i}`}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", transition: { duration: dur.standard, ease } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
            >
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <Wrench className="size-4 shrink-0 text-brand-500" />
                <span className="flex-1 truncate text-sm font-medium text-ink-900">{s.serviceName}</span>
                <span className="text-sm font-semibold text-brand-700 tabular-nums">{money(s.price)}</span>
                <button type="button" onClick={() => remove(i)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${s.serviceName}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {value.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No services yet – add your first one below.</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="input flex-1" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(e)} aria-label="Service name" />
        <input className="input sm:w-36" type="number" min="0" placeholder="Price (৳)" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(e)} aria-label="Price" />
        <Button type="button" variant="dark" onClick={add} disabled={!name.trim() || price === ""}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {unused.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {unused.slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => setName(s)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
