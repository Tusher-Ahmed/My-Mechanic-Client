import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Github, Facebook, Linkedin, LogOut, Menu, X, LayoutDashboard, ClipboardList, Wrench, Mail, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar, Button } from "./ui";
import { PageLoader, gearPath } from "./mech";
import AuthDialog from "./AuthDialog";
import NotificationBell from "./NotificationBell";
import LiveLocationSharer from "./LiveLocationSharer";
import { dur, ease, easeExit } from "../lib/motion";

export function Logo({ dark = false }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="My Mechanic home">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 shadow-sm shadow-brand-900/30">
        <svg viewBox="-24 -24 48 48" className="size-6 transition-transform duration-700 ease-brand group-hover:rotate-180" aria-hidden>
          <path d={gearPath(8, 20, 15, 6)} fillRule="evenodd" fill="#fff" />
        </svg>
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${dark ? "text-white" : "text-ink-900"}`}>
        My <span className="text-brand-500">Mechanic</span>
      </span>
    </Link>
  );
}

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/map", label: "Find mechanics" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function Navbar() {
  const { role, account, openAuth, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboard = role === "mechanic" ? { to: "/mechanic", label: "Dashboard", icon: LayoutDashboard } : { to: "/account", label: "My orders", icon: ClipboardList };
  const handleLogout = () => {
    logout("You've been logged out.");
    navigate("/");
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-250 ease-brand ${scrolled ? "glass border-x-0 border-t-0 border-b-slate-200/70 shadow-sm shadow-slate-900/5" : "border-b border-transparent bg-transparent"}`}>
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="relative rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-ink-900">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-brand-50" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  <span className={`relative ${isActive ? "text-brand-700" : ""}`}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <span className="h-9 w-40 animate-pulse rounded-xl bg-slate-200/70" />
          ) : role ? (
            <>
              <NotificationBell />
              <Button to={dashboard.to} variant="ghost" size="sm">
                <dashboard.icon className="size-4" /> {dashboard.label}
              </Button>
              <Link to={dashboard.to} className="flex items-center gap-2 rounded-full p-0.5 pr-3 hover:bg-slate-100" title={account?.email}>
                <Avatar name={account?.username} className="size-8 text-xs" />
                <span className="max-w-28 truncate text-sm font-semibold text-ink-900">{account?.username?.split(" ")[0]}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out" title="Log out">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => openAuth("register")}>
                Get started
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
        {role && <NotificationBell />}
        <button className="grid size-10 place-items-center rounded-xl text-ink-900 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? "x" : "menu"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: dur.quick }}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="overflow-hidden border-t border-slate-200 bg-white md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: dur.standard, ease } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: easeExit } }}
          >
            <motion.div className="container-page flex flex-col gap-1 py-4" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {[...links, ...(role ? [dashboard] : [])].map((l) => (
                <motion.div key={l.to} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                  <NavLink to={l.to} end={l.end} className={({ isActive }) => `block rounded-xl px-3 py-2.5 font-semibold ${isActive ? "bg-brand-50 text-brand-700" : "text-ink-800"}`}>
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {role ? (
                  <Button variant="secondary" className="col-span-2" onClick={handleLogout}>
                    <LogOut className="size-4" /> Log out
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => openAuth("login")}>
                      Log in
                    </Button>
                    <Button onClick={() => openAuth("register")}>Get started</Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  const { role } = useAuth();
  return (
    <footer className="relative overflow-hidden bg-ink-950 text-slate-400">
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Save more. Stress less.
            <br />
            The future of car repairs starts today.
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { href: "https://www.facebook.com/tusher.ahmed.1447342", icon: Facebook, label: "Facebook" },
              { href: "https://www.linkedin.com/in/tusher-ahmed-6b9b70210/", icon: Linkedin, label: "LinkedIn" },
              { href: "https://github.com/Tusher-Ahmed", icon: Github, label: "GitHub" },
            ].map(({ href, icon: Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-xl bg-white/5 text-slate-300 transition-colors hover:bg-brand-600 hover:text-white">
                <Icon className="size-4.5" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="hover:text-white" to="/about">About us</Link></li>
            <li><Link className="hover:text-white" to="/contact">Contact us</Link></li>
            <li><Link className="hover:text-white" to="/map">Find mechanics</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Earn with your garage</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {role === "mechanic" ? (
              <li><Link className="inline-flex items-center gap-2 hover:text-white" to="/mechanic"><Wrench className="size-4" /> My dashboard</Link></li>
            ) : (
              <>
                <li><Link className="hover:text-white" to="/mechanic/register">Register your garage</Link></li>
                <li><FooterMechanicLogin /></li>
              </>
            )}
          </ul>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><MapPin className="size-4 text-brand-400" /> Dhaka, Bangladesh</li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-brand-400" /> <Link className="hover:text-white" to="/contact">Send us a message</Link></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} My Mechanic · Tusher Ahmed</p>
          <p>Made in Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}

function FooterMechanicLogin() {
  const { openAuth } = useAuth();
  return (
    <button className="hover:text-white" onClick={() => openAuth("login", "mechanic")}>
      Mechanic login
    </button>
  );
}

export default function Layout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const fullBleed = location.pathname === "/map";

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: dur.slow, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: easeExit } }}
        >
          {/* lazy pages suspend here, inside the page – never hiding the layout mid-animation */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      {!fullBleed && <Footer />}
      <AuthDialog />
      <LiveLocationSharer />
    </div>
  );
}
