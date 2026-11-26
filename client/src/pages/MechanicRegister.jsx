import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Clock, Crown, LayoutDashboard, MapPin, Store, UserRound, Wrench } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import { money } from "../lib/format";
import { startCheckout } from "../lib/subscription";
import LocationPicker from "../components/LocationPicker";
import ServiceEditor from "../components/ServiceEditor";
import { Gear } from "../components/mech";
import { CarTypeChooser } from "../components/VehiclePicker";
import { VEHICLE_TYPES } from "../data/vehicles";
import { Button, EmptyState, Field } from "../components/ui";
import { ease, easeExit, shake } from "../lib/motion";

const STEPS = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "shop", label: "Shop", icon: Store },
  { key: "location", label: "Location", icon: MapPin },
  { key: "services", label: "Services", icon: Wrench },
  { key: "plan", label: "Plan", icon: Crown },
];

function validate(step, f) {
  if (step === 0) {
    if (f.username.trim().length < 3) return "Please enter your full name (at least 3 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "Please enter a valid email.";
    if (!/^\+?[0-9\s-]{7,20}$/.test(f.phone)) return "Please enter a valid phone number.";
    if (!/^[0-9]{10,17}$/.test(f.nid)) return "NID must be 10 to 17 digits.";
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) return "Password must be at least 8 characters, with a letter and a number.";
  }
  if (step === 1 && f.shopname.trim().length < 3) return "Shop name must be at least 3 characters.";
  if (step === 1 && f.vehicleTypes.length === 0) return "Select at least one car type you service.";
  if (step === 2 && (f.location.latitude === "" || f.location.longitude === "" || f.location.latitude == null)) return "Please set your shop's location on the map.";
  if (step === 3 && f.services.length === 0) return "Add at least one service with a price.";
  return "";
}

export default function MechanicRegister() {
  const { role, register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, animate] = useAnimate();
  const [f, setF] = useState({
    username: "",
    email: "",
    phone: "",
    nid: "",
    password: "",
    shopname: "",
    address: "",
    location: { latitude: "", longitude: "" },
    services: [],
    vehicleTypes: [...VEHICLE_TYPES],
  });
  const set = (e) => setF((x) => ({ ...x, [e.target.name]: e.target.value }));
  const [plan, setPlan] = useState("monthly"); // monthly | yearly | later
  const [plans, setPlans] = useState(null);
  useEffect(() => {
    api.get("/subscriptions/plans").then(({ data }) => setPlans(data.plans)).catch(() => {});
  }, []);

  if (role === "mechanic")
    return (
      <div className="container-page py-20">
        <EmptyState icon={<Wrench className="size-6" />} title="You're already registered" action={<Button to="/mechanic"><LayoutDashboard className="size-4" /> Open dashboard</Button>}>
          Manage your orders, services and location from your dashboard.
        </EmptyState>
      </div>
    );

  const go = (next) => {
    if (next > step) {
      const msg = validate(step, f);
      if (msg) {
        setError(msg);
        if (scope.current) animate(scope.current, { x: shake.x }, shake.transition);
        return;
      }
    }
    setError("");
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const submit = async () => {
    const msg = validate(3, f);
    if (msg) return setError(msg);
    setBusy(true);
    try {
      const { location, ...rest } = f;
      await register("mechanic", { ...rest, latitude: location.latitude, longitude: location.longitude });
      if (plan === "later") {
        toast("Account created – choose a plan any time to appear on the map.");
        navigate("/mechanic?tab=subscription");
      } else {
        toast.success("Account created – one last step: payment.");
        await startCheckout(plan, navigate);
      }
    } catch (err) {
      setError(errorMessage(err));
      if (scope.current) animate(scope.current, { x: shake.x }, shake.transition);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <svg viewBox="0 0 300 300" className="pointer-events-none absolute -top-20 -left-24 w-96 opacity-60" aria-hidden>
        <Gear x={150} y={150} teeth={16} size={110} period={36} className="fill-brand-100" />
      </svg>
      <div className="container-page relative max-w-3xl py-12 lg:py-16">
        <div className="text-center">
          <span className="eyebrow">For garages & mechanics</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Register your garage</h1>
          <p className="mt-2 text-slate-600">Five quick steps and drivers nearby can find and book you.</p>
        </div>

        {/* progress */}
        <ol className="mt-10 grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.key} className="flex flex-col items-center gap-2">
                <motion.span
                  animate={{ scale: current ? 1.08 : 1 }}
                  className={`grid size-11 place-items-center rounded-2xl transition-colors duration-250 ${done ? "bg-brand-600 text-white" : current ? "bg-ink-900 text-white shadow-lg" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}
                >
                  {done ? <Check className="size-5" strokeWidth={3} /> : <s.icon className="size-5" />}
                </motion.span>
                <span className={`text-xs font-semibold ${current ? "text-ink-900" : "text-slate-500"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div className="h-full rounded-full bg-linear-to-r from-brand-500 to-accent-400" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4, ease }} />
        </div>

        <div ref={scope} className="card mt-8 overflow-hidden p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (d) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
                exit: (d) => ({ opacity: 0, x: d * -30, transition: { duration: 0.18, ease: easeExit } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" name="username" value={f.username} onChange={set} autoComplete="name" />
                  <Field label="Phone" name="phone" type="tel" value={f.phone} onChange={set} autoComplete="tel" placeholder="01XXXXXXXXX" />
                  <Field label="Email" name="email" type="email" value={f.email} onChange={set} autoComplete="email" />
                  <Field label="NID number" name="nid" inputMode="numeric" value={f.nid} onChange={set} hint="10–17 digits, only visible to admins" />
                  <Field label="Password" name="password" type="password" value={f.password} onChange={set} autoComplete="new-password" hint="At least 8 characters, with a letter and a number" className="sm:col-span-2" />
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4">
                  <Field label="Shop name" name="shopname" value={f.shopname} onChange={set} placeholder="e.g. Karim Auto Works" />
                  <Field label="Address / area (optional)" name="address" value={f.address} onChange={set} placeholder="e.g. Road 4, Mirpur 10, Dhaka" />
                  <div>
                    <span className="label">Car types you service</span>
                    <CarTypeChooser multiple ariaLabel="Car types you service" placeholder="Select car types" value={f.vehicleTypes} onChange={(vehicleTypes) => setF((x) => ({ ...x, vehicleTypes }))} />
                    <p className="mt-1.5 text-xs text-slate-500">Customers filter the map by car type. You can change this later.</p>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div>
                  <p className="mb-4 text-sm text-slate-600">Where is your garage? Customers will see this pin on the map.</p>
                  <LocationPicker value={f.location} onChange={(location) => setF((x) => ({ ...x, location }))} />
                </div>
              )}
              {step === 3 && (
                <div>
                  <p className="mb-4 text-sm text-slate-600">What do you offer? You can change services and prices any time later.</p>
                  <ServiceEditor value={f.services} onChange={(services) => setF((x) => ({ ...x, services }))} />
                </div>
              )}
              {step === 4 && (
                <div>
                  <p className="mb-4 text-sm text-slate-600">Choose a plan to appear on the map. Starter prices for your first period – no commission on bookings.</p>
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
                    {["monthly", "yearly"].map((key) => {
                      const p = plans?.[key];
                      const on = plan === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setPlan(key)}
                          className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${on ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          {key === "yearly" && <span className="absolute -top-2.5 right-3 rounded-full bg-accent-400 px-2 py-0.5 text-[11px] font-bold text-ink-900">Best value</span>}
                          <span className="block text-sm font-semibold text-brand-700">{p?.label ?? key}</span>
                          <span className="mt-1 block font-display text-2xl font-bold text-ink-900">
                            {p ? money(p.introPrice) : "…"}
                            <span className="text-sm font-medium text-slate-500"> first {key === "yearly" ? "year" : "month"}</span>
                          </span>
                          {p && <span className="block text-xs text-slate-500">then {money(p.price)} / {key === "yearly" ? "year" : "month"} · loyalty discount on renewals</span>}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <input type="radio" name="plan-later" className="accent-brand-600" checked={plan === "later"} onChange={() => setPlan("later")} />
                    <Clock className="size-4 text-slate-400" /> Decide later (your garage stays hidden until you choose a plan)
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => go(step + 1)}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button variant="accent" onClick={submit} loading={busy}>
                <Check className="size-4" /> {plan === "later" || !plans ? "Create my garage" : `Create garage & pay ${money(plans[plan].introPrice)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
