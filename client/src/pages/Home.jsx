import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BadgeCheck, ChevronDown, ClipboardCheck, LockOpen, MapPin, Navigation, Phone, ShieldCheck, Tag, Wrench, Zap } from "lucide-react";
import HeroScene from "../components/HeroScene";
import { Car, Gear, TighteningWrench } from "../components/mech";
import { Button, Reveal, SectionHeading } from "../components/ui";
import { FAQ, SERVICES_TICKER } from "../data/content";
import { useAuth } from "../context/AuthContext";
import { dur, ease, easeEmphasized, fadeUp, stagger } from "../lib/motion";

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16">
      {/* ambient background */}
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="container-page relative grid items-center gap-14 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <motion.div initial="hidden" animate="show" variants={stagger(0.1, 0.05)}>
          <motion.span variants={fadeUp} className="eyebrow">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-brand-500" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
            </span>
            Car trouble? Help is nearby
          </motion.span>

          <motion.h1 variants={fadeUp} className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find a trusted mechanic{" "}
            <span className="whitespace-nowrap">
            <span className="relative inline-block text-brand-600">
              near you
              <svg viewBox="0 0 220 16" className="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none" aria-hidden>
                <motion.path
                  d="M3 11 C 60 3, 150 3, 217 9"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease, delay: 0.6 }}
                />
              </svg>
            </span>
            ,
            </span>{" "}
            in minutes.
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Broken down somewhere unfamiliar? See garages around you on a live map, compare upfront prices and book the service you need – no
            more searching street by street.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/map" size="lg">
              <Navigation className="size-5" /> Find mechanics near me
            </Button>
            <Button to="/mechanic/register" size="lg" variant="secondary">
              <Wrench className="size-5" /> I'm a mechanic
            </Button>
          </motion.div>

          <motion.ul variants={fadeUp} className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
            {[
              { icon: MapPin, label: "Live garage map" },
              { icon: Tag, label: "Upfront prices" },
              { icon: ShieldCheck, label: "30-day warranty" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
                  <Icon className="size-4.5" />
                </span>
                <span className="font-semibold text-ink-800">{label}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <HeroScene />
      </div>
    </section>
  );
}

/* ---------------- Services marquee ---------------- */
function Ticker() {
  const items = [...SERVICES_TICKER, ...SERVICES_TICKER];
  return (
    <div className="relative overflow-hidden border-y border-ink-800 bg-ink-900 py-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-8 hover:[animation-play-state:paused]">
        {items.map((s, i) => (
          <span key={i} className="flex items-center gap-8 text-sm font-semibold whitespace-nowrap text-slate-300">
            {s}
            <svg viewBox="-12 -12 24 24" className="size-4 animate-spin-slow fill-brand-400" aria-hidden>
              <path d="M10,0 L7,2 L7,-2 Z" />
              <circle r="6" />
              <circle r="2.5" fill="#0a1530" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- How it works ---------------- */
const steps = [
  { icon: MapPin, title: "Open the map", text: "We show garages and mechanics around your location, with their services and starting prices." },
  { icon: ClipboardCheck, title: "Pick your services", text: "Choose what you need from the shop's price list. The total is calculated upfront – no surprises." },
  { icon: Phone, title: "Mechanic accepts", text: "As soon as the mechanic accepts, you both get each other's phone number to sort out the details." },
];

function HowItWorks() {
  return (
    <section className="container-page py-24">
      <SectionHeading eyebrow="How it works" title="From breakdown to back on the road" subtitle="Three simple steps. No phone calls to strangers, no haggling on the roadside." />

      <div className="relative">
        {/* the road + driving car (desktop) */}
        <div className="pointer-events-none absolute top-9 right-[16%] left-[16%] hidden lg:block" aria-hidden>
          <div className="h-1 rounded-full bg-[repeating-linear-gradient(90deg,#cbd5e1_0_14px,transparent_14px_26px)]" />
          <motion.div
            className="absolute -top-[30px] w-20"
            initial={{ left: "0%" }}
            whileInView={{ left: "calc(100% - 8.5rem)" }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 2.4, ease: [0.45, 0, 0.2, 1], delay: 0.3 }}
          >
            <Car />
          </motion.div>
        </div>

        <motion.div className="grid gap-6 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger(0.1)}>
          {steps.map((s, i) => (
            <motion.div key={s.title} variants={fadeUp} className="flex flex-col items-center text-center">
              <div className="relative z-10 grid size-18 place-items-center rounded-3xl bg-white text-brand-600 shadow-lg ring-1 shadow-brand-900/10 ring-slate-200">
                <s.icon className="size-8" />
                <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-accent-400 text-xs font-bold text-ink-900">{i + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 max-w-xs text-slate-600">{s.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Feature bento ---------------- */
function MiniMap() {
  const pins = [
    { x: "22%", y: "38%" },
    { x: "48%", y: "22%" },
    { x: "70%", y: "52%" },
    { x: "36%", y: "68%" },
    { x: "82%", y: "26%" },
  ];
  return (
    <div className="relative h-48 overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
      <div className="bg-grid absolute inset-0" />
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <path d="M0 60 Q30 50 50 62 T100 48" stroke="#fff" strokeWidth="5" fill="none" />
        <path d="M40 0 Q46 40 38 100" stroke="#fff" strokeWidth="4" fill="none" />
      </svg>
      {pins.map((p, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.2 + i * 0.07 }}
        >
          <MapPin className={`size-7 drop-shadow ${i === 2 ? "fill-accent-400 text-ink-900" : "fill-brand-500 text-white"}`} />
        </motion.div>
      ))}
      <div className="absolute top-[52%] left-[70%] size-10 -translate-x-1/2 -translate-y-1/2 animate-ping-slow rounded-full bg-accent-400/40" />
    </div>
  );
}

function Gauge() {
  return (
    <svg viewBox="0 0 120 70" className="mx-auto h-28" aria-hidden>
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
      <motion.path
        d="M10 62 A50 50 0 0 1 110 62"
        fill="none"
        stroke="url(#gauge)"
        strokeWidth="10"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 0.86 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: easeEmphasized, delay: 0.2 }}
      />
      <defs>
        <linearGradient id="gauge" x1="0" x2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#129d92" />
        </linearGradient>
      </defs>
      <motion.g
        style={{ originX: "60px", originY: "62px" }}
        initial={{ rotate: -90 }}
        whileInView={{ rotate: 64 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 60, damping: 9, delay: 0.2 }}
      >
        <path d="M58 62 L60 22 L62 62 Z" fill="#0a1530" />
      </motion.g>
      <circle cx="60" cy="62" r="6" fill="#0a1530" />
    </svg>
  );
}

function PriceList() {
  const rows = [
    ["Oil change", 800],
    ["Brake check", 500],
    ["Battery jump-start", 350],
  ];
  return (
    <motion.ul className="space-y-2" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger(0.06, 0.15)}>
      {rows.map(([name, price]) => (
        <motion.li key={name} variants={fadeUp} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm ring-1 ring-slate-100">
          <span className="font-medium text-ink-800">{name}</span>
          <span className="font-semibold text-brand-700">৳{price}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function UnlockVisual() {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <motion.div
        className="grid size-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/20"
        initial={{ rotate: -8, scale: 0.9 }}
        whileInView={{ rotate: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 }}
      >
        <LockOpen className="size-7" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: dur.slow, ease, delay: 0.5 }}
        className="rounded-xl bg-white px-3 py-2 text-sm shadow-md ring-1 ring-slate-200"
      >
        <p className="text-xs text-slate-500">Mechanic phone</p>
        <p className="font-semibold text-ink-900">01X·XXX·XXXXX</p>
      </motion.div>
    </div>
  );
}

function Features() {
  const card = "card relative overflow-hidden p-6 sm:p-8";
  return (
    <section className="bg-white py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Why My Mechanic" title="Everything you need when your car lets you down" />
        <div className="grid gap-5 md:grid-cols-6">
          <Reveal className={`${card} md:col-span-4`}>
            <MiniMap />
            <h3 className="mt-6 text-xl font-semibold">We make it easy</h3>
            <p className="mt-2 text-slate-600">Every registered garage appears on the map with its exact location. Tap a pin to see the shop, its services and prices, then book online 24/7.</p>
          </Reveal>
          <Reveal delay={0.08} className={`${card} md:col-span-2`}>
            <PriceList />
            <h3 className="mt-6 text-xl font-semibold">Fair & transparent pricing</h3>
            <p className="mt-2 text-slate-600">Prices are set upfront for every service. Book with confidence.</p>
          </Reveal>
          <Reveal className={`${card} md:col-span-2`}>
            <UnlockVisual />
            <h3 className="mt-4 text-xl font-semibold">Privacy first</h3>
            <p className="mt-2 text-slate-600">Phone numbers are only shared once a mechanic accepts your order.</p>
          </Reveal>
          <Reveal delay={0.08} className={`${card} md:col-span-2`}>
            <Gauge />
            <h3 className="mt-4 text-xl font-semibold">Happiness guaranteed</h3>
            <p className="mt-2 text-slate-600">We only work with highly rated mechanics. Repairs come with a 30-day warranty.</p>
          </Reveal>
          <Reveal delay={0.16} className={`${card} md:col-span-2 bg-ink-900 text-slate-300`}>
            <div className="flex h-28 items-center justify-center">
              <div className="grid size-20 place-items-center rounded-3xl bg-white/10">
                <TighteningWrench className="size-10 text-accent-400" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Track every job</h3>
            <p className="mt-2">See each order go from pending to accepted to completed – all in your account.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Mechanics band ---------------- */
function ForMechanics() {
  const { role } = useAuth();
  return (
    <section className="relative overflow-hidden bg-ink-900 py-24 text-slate-300">
      <div className="bg-grid-dark absolute inset-0" />
      <svg viewBox="0 0 400 400" className="pointer-events-none absolute -top-24 -right-24 w-[520px] opacity-60" aria-hidden>
        <Gear x={230} y={170} teeth={18} size={120} period={40} className="fill-brand-500/15" />
        <Gear x={78} y={308} teeth={10} size={70} period={22.2} reverse offset={9} className="fill-brand-400/15" />
        <Gear x={330} y={336} teeth={8} size={56} period={17.8} reverse offset={12} className="fill-accent-400/15" />
      </svg>
      <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow border-white/15 bg-white/10 text-brand-200">For garages & mechanics</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Put your garage on the map. Get customers who need you right now.</h2>
          <p className="mt-4 text-lg text-slate-300">Register once, add your services and prices, and drivers nearby can find and book you instantly.</p>
          <ul className="mt-8 space-y-3">
            {["Free to join – no commission", "Your own dashboard to accept and complete jobs", "Update services and prices any time"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <BadgeCheck className="size-5 shrink-0 text-brand-400" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button to={role === "mechanic" ? "/mechanic" : "/mechanic/register"} size="lg" variant="accent">
              {role === "mechanic" ? "Open my dashboard" : "Register your garage"} <ArrowRight className="size-5" />
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="glass rounded-3xl border-white/10 bg-white/5 p-6 text-slate-200 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">New order</p>
              <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">Pending</span>
            </div>
            <div className="mt-5 space-y-2 text-sm">
              {[
                ["Engine diagnosis", "৳1,200"],
                ["Oil change", "৳800"],
              ].map(([n, p]) => (
                <div key={n} className="flex justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span>{n}</span>
                  <span className="font-semibold text-white">{p}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-sm">Total</span>
              <span className="font-display text-2xl font-bold text-white">৳2,000</span>
            </div>
            <motion.div
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white"
              initial={{ scale: 0.96 }}
              whileInView={{ scale: [0.96, 1.03, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Zap className="size-4" /> Accept order
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`card overflow-hidden transition-shadow duration-250 ${open ? "shadow-md ring-1 ring-brand-200" : ""}`}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
        <span className="font-semibold text-ink-900">{item.q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: dur.standard, ease }} className={`grid size-8 shrink-0 place-items-center rounded-full ${open ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: dur.standard, ease } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: [0.3, 0, 1, 1] } }}
          >
            <p className="px-5 pb-5 leading-relaxed text-slate-600 sm:px-6">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="container-page py-24">
      <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
      <motion.div className="mx-auto max-w-3xl space-y-3" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger(0.05)}>
        {FAQ.map((item, i) => (
          <motion.div key={item.q} variants={fadeUp}>
            <FaqItem item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <HowItWorks />
      <Features />
      <ForMechanics />
      <Faq />
    </>
  );
}
