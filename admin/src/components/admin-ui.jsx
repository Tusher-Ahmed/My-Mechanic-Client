import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Search, X } from "lucide-react";
import { Button, Modal } from "./ui";
import { dur, ease, easeExit } from "../lib/motion";

/* ---------------- Data table: search · sort · pagination ---------------- */
export function DataTable({ columns, rows, loading, search, emptyText = "Nothing here yet.", onRowClick, pageSize = 10, toolbar, initialSort }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort ?? null); // { key, dir }
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    let list = q && search ? rows.filter((r) => search(r).toLowerCase().includes(q)) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const val = col?.sortValue ?? ((r) => r[sort.key]);
      list = [...list].sort((a, b) => {
        const x = val(a);
        const y = val(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, sort, columns, search]);

  useEffect(() => {
    setPage(0);
  }, [query, rows?.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        {search ? (
          <label className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search table" />
          </label>
        ) : (
          <span />
        )}
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 whitespace-nowrap ${c.className ?? ""}`}>
                  {c.sortable === false ? (
                    c.header
                  ) : (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink-900">
                      {c.header}
                      {sort?.key === c.key ? sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-40" />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading || !rows ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-4">
                      <span className="block h-3.5 w-3/4 animate-pulse rounded bg-slate-200/70" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-slate-500">
                  {query ? `No results for "${query}".` : emptyText}
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {visible.map((r, i) => (
                  <motion.tr
                    key={r._id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: dur.standard, ease, delay: Math.min(i * 0.02, 0.2) } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={`align-middle transition-colors ${onRowClick ? "cursor-pointer hover:bg-brand-50/40" : "hover:bg-slate-50/60"}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 ${c.cellClassName ?? ""}`}>
                        {c.render ? c.render(r) : r[c.key]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {rows && filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Drawer (slide-in side panel for forms/details) ---------------- */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-xl" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => ref.current?.querySelector("input,select,textarea")?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: dur.standard } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
          />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl ${width}`}
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { duration: dur.slow, ease } }}
            exit={{ x: "100%", transition: { duration: 0.25, ease: easeExit } }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{title}</h2>
                {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink-900" aria-label="Close">
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Confirm dialog (promise based) ---------------- */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, resolve });
      }),
    []
  );
  const close = (answer) => {
    state?.resolve(answer);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title} size="sm">
        <div className="p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">{state?.title}</h2>
          {state?.message && <p className="mt-2 text-sm text-slate-600">{state.message}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => close(true)}>
              {state?.confirmLabel ?? "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

/* ---------------- Page header ---------------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.slow, ease }}
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}

/** Small "label: value" row for detail drawers. */
export function Detail({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-medium break-words text-ink-900">{children}</span>
    </div>
  );
}
