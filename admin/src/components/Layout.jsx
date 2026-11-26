import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardList, ExternalLink, LayoutDashboard, LogOut, Mail, Menu, ShieldCheck, Users, Wrench, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CLIENT_URL } from "../lib/api";
import { gearPath } from "./mech";
import { Avatar } from "./ui";
import { dur, ease, easeExit } from "../lib/motion";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/mechanics", label: "Mechanics", icon: Wrench },
  { to: "/users", label: "Customers", icon: Users },
  { to: "/messages", label: "Messages", icon: Mail },
  { to: "/admins", label: "Admins", icon: ShieldCheck },
];

function Brand() {
  return (
    <div className="group flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600">
        <svg viewBox="-24 -24 48 48" className="size-6 transition-transform duration-700 ease-brand group-hover:rotate-180" aria-hidden>
          <path d={gearPath(8, 20, 15, 6)} fillRule="evenodd" fill="#fff" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className="font-display text-base font-bold text-white">
          My <span className="text-brand-400">Mechanic</span>
        </p>
        <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Admin panel</p>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { admin, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className="relative block">
            {({ isActive }) => (
              <span className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`}>
                {isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <Icon className={`relative size-4.5 ${isActive ? "text-brand-400" : ""}`} />
                <span className="relative">{label}</span>
              </span>
            )}
          </NavLink>
        ))}
        <a href={CLIENT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-white">
          <ExternalLink className="size-4.5" /> Open website
        </a>
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <Avatar name={admin?.username} className="size-9 text-xs" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{admin?.username}</p>
          <p className="truncate text-xs text-slate-400">{admin?.email}</p>
        </div>
        <button onClick={() => logout("Logged out.")} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-64">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-ink-950 lg:block">
        <SidebarContent />
      </aside>

      {/* mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-950 px-4 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </header>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink-950/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-72 bg-ink-950"
              initial={{ x: "-100%" }}
              animate={{ x: 0, transition: { duration: dur.slow, ease } }}
              exit={{ x: "-100%", transition: { duration: 0.22, ease: easeExit } }}
            >
              <button onClick={() => setOpen(false)} className="absolute top-5 right-3 grid size-9 place-items-center rounded-lg text-slate-400 hover:text-white" aria-label="Close menu">
                <X className="size-5" />
              </button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: dur.slow, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: easeExit } }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
