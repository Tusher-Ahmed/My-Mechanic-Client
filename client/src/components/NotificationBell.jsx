import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Bell, BellOff, CheckCheck, CheckCircle2, ClipboardList, Info, PartyPopper, XCircle } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import { timeAgo } from "../lib/format";
import { dur, ease, easeExit } from "../lib/motion";

const TYPE_STYLE = {
  order_new: { icon: ClipboardList, cls: "bg-brand-50 text-brand-600" },
  order_accepted: { icon: CheckCircle2, cls: "bg-sky-50 text-sky-600" },
  order_completed: { icon: PartyPopper, cls: "bg-emerald-50 text-emerald-600" },
  order_cancelled: { icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  order_updated: { icon: Info, cls: "bg-amber-50 text-amber-600" },
  system: { icon: Info, cls: "bg-slate-100 text-slate-600" },
};

export default function NotificationBell() {
  const { items, unread, ring, live, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [bellScope, animateBell] = useAnimate();
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  // shake the bell when a live notification arrives (attention: rotation, ~600ms, decaying)
  useEffect(() => {
    if (ring > 0 && bellScope.current) {
      animateBell(bellScope.current, { rotate: [0, -18, 14, -10, 6, -2, 0] }, { duration: 0.65, ease: "easeInOut" });
    }
  }, [ring, animateBell, bellScope]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n) => {
    markRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-xl text-ink-800 transition-colors hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        data-testid="notification-bell"
      >
        <span ref={bellScope} className="grid place-items-center" style={{ transformOrigin: "50% 10%" }}>
          <Bell className="size-5" />
        </span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white"
              data-testid="notification-count"
            >
              <motion.span key={unread} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: dur.quick }}>
                {unread > 9 ? "9+" : unread}
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: dur.standard, ease } }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15, ease: easeExit } }}
            style={{ transformOrigin: "top right" }}
            className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-sm font-bold text-ink-900">Notifications</h3>
                <span className={`flex items-center gap-1 text-[11px] font-medium ${live ? "text-emerald-600" : "text-slate-400"}`} title={live ? "Live updates on" : "Reconnecting…"}>
                  <span className={`size-1.5 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
                  {live ? "Live" : "Offline"}
                </span>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  <CheckCheck className="size-3.5" /> Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <BellOff className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink-900">You're all caught up</p>
                  <p className="mt-1 text-xs text-slate-500">Order updates will appear here instantly.</p>
                </div>
              ) : (
                <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.03 } } }}>
                  {items.map((n) => {
                    const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
                    const Icon = style.icon;
                    return (
                      <motion.li key={n._id} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                        <button
                          onClick={() => openItem(n)}
                          className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/40"}`}
                        >
                          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${style.cls}`}>
                            <Icon className="size-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${n.read ? "text-slate-700" : "font-semibold text-ink-900"}`}>{n.title}</span>
                            {n.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{n.body}</span>}
                            <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                          </span>
                          {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-label="unread" />}
                        </button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
