import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, ClipboardList, MapPinned, Navigation, ShoppingCart, Store as StoreIcon, UserRound, Wrench, Truck, Stethoscope, Search } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { getPositionOnce, googleMapsUrl } from "../lib/map";
import { DEFAULT_TRAVEL_PRICING, travelFeeFor } from "../lib/pricing";
import { distanceKm, km } from "../lib/format";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { Car, Gear, GearLoader } from "../components/mech";
import { AnimatedNumber, Button, EmptyState, Field, Modal } from "../components/ui";
import VehiclePicker, { CarTypeIcon, VehicleTypeBadges, cleanVehicle, isVehicleComplete } from "../components/VehiclePicker";
import { emptyVehicle, getPreferredCarType, vehicleLabel } from "../data/vehicles";
import { dur, ease, fadeUp, stagger } from "../lib/motion";

function ServiceCard({ service, selected, onToggle, disabled }) {
  return (
    <motion.li variants={fadeUp}>
      <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        whileTap={{ scale: 0.985 }}
        aria-pressed={selected}
        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ease-brand disabled:cursor-not-allowed ${selected ? "border-brand-500 bg-brand-50/70 shadow-md ring-2 ring-brand-500/15" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
      >
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          <Wrench className="size-5" />
        </span>
        <span className="flex-1 font-semibold text-ink-900">{service.serviceName}</span>
        <span className="font-display text-lg font-bold text-ink-900 tabular-nums">{money(service.price)}</span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${selected ? "border-brand-600 bg-brand-600" : "border-slate-300"}`}>
          <AnimatePresence>
            {selected && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                <Check className="size-4 text-white" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </motion.li>
  );
}

function InspectionCard({ fee, selected, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
      data-testid="inspection-option"
      className={`flex w-full items-center gap-4 rounded-2xl border-2 border-dashed p-4 text-left transition-all duration-200 ease-brand ${selected ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-500/15" : "border-amber-300/80 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/60"}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${selected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"}`}>
        <Search className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900">Not sure what's wrong? Book an inspection</span>
        <span className="block text-xs text-slate-500">A mechanic finds the problem and tells you what it needs. You only pay the inspection fee + travel – then book the fix if you want.</span>
      </span>
      <span className="font-display text-lg font-bold text-ink-900 tabular-nums">{money(fee)}</span>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${selected ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}>
        <AnimatePresence>
          {selected && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
              <Check className="size-4 text-white" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

function OrderPlaced({ open, onClose, shopname, order }) {
  const navigate = useNavigate();
  return (
    <Modal open={open} onClose={onClose} title="Order placed">
      <div className="overflow-hidden p-8 text-center">
        {/* story: car drives in to the garage, check pops – "help is coming" */}
        <div className="relative mx-auto h-28 overflow-hidden rounded-2xl bg-ink-900">
          <div className="absolute inset-x-0 bottom-0 h-6 bg-[#0b1328]" />
          <div className="absolute inset-x-0 bottom-[22px] h-0.5 bg-[repeating-linear-gradient(90deg,#fcd34d_0_18px,transparent_18px_32px)] opacity-70" />
          <motion.div className="absolute bottom-3 w-32" initial={{ left: "-40%" }} animate={{ left: "34%" }} transition={{ duration: 1.3, ease: [0.25, 0.1, 0.25, 1] }}>
            <Car />
          </motion.div>
          <motion.span
            className="absolute top-3 right-4 grid size-10 place-items-center rounded-full bg-emerald-500 text-white shadow-lg"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 14, delay: 1.2 }}
          >
            <Check className="size-6" strokeWidth={3} />
          </motion.span>
        </div>
        <motion.div initial="hidden" animate="show" variants={stagger(0.08, 0.5)}>
          <motion.h2 variants={fadeUp} className="mt-6 text-2xl font-bold">
            {order?.kind === "inspection" ? "Inspection booked!" : "Order placed!"}
          </motion.h2>
          {order?.number && (
            <motion.p variants={fadeUp} className="mt-2">
              <span className="rounded-lg bg-ink-900 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-white" data-testid="placed-number">
                MM-{order.number}
              </span>
            </motion.p>
          )}
          <motion.p variants={fadeUp} className="mt-2 text-slate-600">
            {shopname} has been notified. You'll get a notification – and their phone number – as soon as they accept.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate("/account")}>
              <ClipboardList className="size-4" /> View my orders
            </Button>
            <Button variant="secondary" onClick={() => navigate("/map")}>
              Back to map
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Modal>
  );
}

export default function Store() {
  const { id } = useParams();
  const { role, account, openAuth, refreshMe } = useAuth();
  const [shop, setShop] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [inspection, setInspection] = useState(false);
  const [params] = useSearchParams();
  const followUpId = params.get("followUp");
  const [parent, setParent] = useState(null); // the completed inspection this order follows up
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [mode, setMode] = useState("home"); // "home" = mechanic comes to me · "garage" = I bring the car
  const [here, setHere] = useState({ status: "idle", pos: null }); // idle | locating | ok | denied
  const savedCars = role === "user" ? (account?.vehicles ?? []) : [];
  const [car, setCar] = useState({ vehicle: { ...emptyVehicle, type: getPreferredCarType() }, save: true });

  // when the customer logs in, preselect their first saved car
  useEffect(() => {
    if (role === "user" && account?.vehicles?.length) {
      const v = account.vehicles[0];
      setCar({ vehicle: { ...emptyVehicle, ...v, year: v.year ?? "", plate: v.plate ?? "" }, save: false });
    }
  }, [role, account?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api
      .get(`/mechanics/${id}`)
      .then(({ data }) => setShop(data))
      .catch((err) => setError(err.response?.status === 404 || err.response?.status === 400 ? "This shop doesn't exist (anymore)." : errorMessage(err)));
  }, [id]);

  // follow-up from an inspection: preselect the recommended services and the same meeting place
  useEffect(() => {
    if (!followUpId || role !== "user") return;
    api
      .get("/orders/mine")
      .then(({ data }) => {
        const p = data.find((o) => o._id === followUpId && o.kind === "inspection" && o.status === "completed");
        if (!p) return;
        setParent(p);
        setMode(p.serviceMode);
        const want = (params.get("services") || "").split(",").filter(Boolean);
        if (want.length) setSelected(want);
      })
      .catch(() => {});
  }, [followUpId, role]); // eslint-disable-line react-hooks/exhaustive-deps
  const travelWaived = !!parent && parent.serviceMode === "home" && mode === "home" && Date.now() - new Date(parent.updatedAt).getTime() <= 24 * 3_600_000;
  const inspectionFee = shop?.inspectionFee ?? 300;

  const chosen = useMemo(() => (shop ? shop.services.filter((s) => selected.includes(s._id)) : []), [shop, selected]);
  const servicesTotal = inspection ? inspectionFee : chosen.reduce((sum, s) => sum + s.price, 0);
  const hasItems = inspection || chosen.length > 0;
  const pricing = { ...DEFAULT_TRAVEL_PRICING, ...(shop?.travelPricing || {}) };
  const tripKm = mode === "home" && here.pos && shop ? distanceKm(shop, here.pos) : null;
  const tooFar = tripKm != null && pricing.maxDistanceKm && tripKm > pricing.maxDistanceKm;
  const travelFee = tripKm != null && !travelWaived ? travelFeeFor(pricing, tripKm) : 0;
  // the travel charge only applies once there is something to book
  const total = hasItems ? servicesTotal + (mode === "home" ? travelFee : 0) : 0;

  // locate the customer when they choose home service (estimate only – the server decides the real charge)
  useEffect(() => {
    if (mode !== "home" || here.status !== "idle") return;
    setHere({ status: "locating", pos: null });
    getPositionOnce().then((pos) => setHere(pos ? { status: "ok", pos } : { status: "denied", pos: null }));
  }, [mode, here.status]);
  const homeBlocked = mode === "home" && (here.status !== "ok" || tooFar);
  const closed = shop?.acceptingOrders === false; // garage's plan has expired
  const toggle = (sid) => {
    setInspection(false); // services and an inspection are booked separately
    setSelected((list) => (list.includes(sid) ? list.filter((x) => x !== sid) : [...list, sid]));
  };
  const toggleInspection = () => {
    setSelected([]);
    setInspection((v) => !v);
  };

  const carReady = isVehicleComplete(car.vehicle);
  const carSupported = !car.vehicle.type || !shop?.vehicleTypes || shop.vehicleTypes.includes(car.vehicle.type);

  const book = async () => {
    if (role !== "user") return openAuth("login", "user");
    if (!carReady) {
      toast.error("Tell us which car needs service (type, make and model).");
      document.getElementById("your-car")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      // fresh position at booking time for home service
      const location = mode === "home" ? ((await getPositionOnce()) ?? here.pos) : null;
      if (mode === "home" && !location) {
        toast.error("Allow location access so the mechanic can find you – or choose to bring the car to the garage.");
        return;
      }
      const { data: placedOrder } = await api.post("/orders", {
        serviceMode: mode,
        ...(location ? { location } : {}),
        mechanicId: shop._id,
        ...(inspection ? { inspection: true } : { serviceIds: selected }),
        ...(parent && !inspection ? { followUpOf: parent._id } : {}),
        vehicle: cleanVehicle(car.vehicle),
        saveVehicle: car.save,
        note: note.trim() || undefined,
      });
      if (car.save) refreshMe().catch(() => {});
      window.dispatchEvent(new Event("mm:orders-changed")); // starts live location sharing if enabled
      setPlaced(placedOrder);
      setSelected([]);
      setInspection(false);
      setParent(null);
      setNote("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="container-page py-20">
        <EmptyState icon={<StoreIcon className="size-6" />} title="Shop not found" action={<Button to="/map">Browse the map</Button>}>
          {error}
        </EmptyState>
      </div>
    );
  if (!shop)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <GearLoader label="Opening the shop" />
      </div>
    );

  return (
    <div className="container-page py-8 lg:py-12">
      <Button to="/map" variant="ghost" size="sm" className="-ml-3">
        <ArrowLeft className="size-4" /> Back to map
      </Button>

      {/* shop header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.slow, ease }}
        className="relative mt-4 overflow-hidden rounded-3xl bg-ink-900 p-6 text-slate-300 sm:p-10"
      >
        <div className="bg-grid-dark absolute inset-0" />
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute -top-10 -right-10 w-64 sm:w-80" aria-hidden>
          <Gear x={110} y={80} teeth={12} size={60} period={20} className="fill-brand-500/20" />
          <Gear x={38} y={150} teeth={8} size={40} period={13.3} reverse offset={11} className="fill-accent-400/20" />
        </svg>
        <div className="relative">
          <span className="eyebrow border-white/15 bg-white/10 text-brand-200">
            <StoreIcon className="size-3.5" /> Garage
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{shop.shopname}</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <UserRound className="size-4 text-brand-400" /> {shop.username}
            </span>
            {shop.address && (
              <span className="flex items-center gap-2">
                <MapPinned className="size-4 text-brand-400" /> {shop.address}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Wrench className="size-4 text-brand-400" /> {shop.services.length} services
            </span>
          </div>
          {shop.vehicleTypes?.length > 0 && (
            <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">We service</span>
              <VehicleTypeBadges types={shop.vehicleTypes} tone="dark" max={3} />
            </div>
          )}
          <Button href={googleMapsUrl(shop)} target="_blank" rel="noopener noreferrer" variant="accent" size="sm" className="mt-6">
            <Navigation className="size-4" /> Get directions
          </Button>
        </div>
      </motion.section>

      {closed && (
        <div role="alert" data-testid="shop-closed" className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm">
            <b>{shop.shopname} isn't taking bookings right now.</b> You can still see its services, but booking is disabled.{" "}
            <Link to="/map" className="font-semibold underline">Find another garage nearby</Link>
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          {role !== "mechanic" && (
            <div id="your-car" className="card mb-8 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <span className="grid size-7 place-items-center rounded-full bg-ink-900 text-sm text-white">1</span> Your car
              </h2>
              <p className="mt-1 mb-5 text-sm text-slate-500">The mechanic sees this before accepting, so they come prepared.</p>
              <VehiclePicker saved={savedCars} value={car} onChange={setCar} key={savedCars.length ? "saved" : "new"} />
              <AnimatePresence>
                {!carSupported && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800"
                  >
                    {shop.shopname} doesn't service {car.vehicle.type} cars. Pick another car type or find another garage on the map.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {role !== "mechanic" && (
            <div className="card mb-8 p-5 sm:p-6" id="meet">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <span className="grid size-7 place-items-center rounded-full bg-ink-900 text-sm text-white">2</span> How should we meet?
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="How should we meet?">
                {[
                  { value: "home", title: "Mechanic comes to me", icon: Truck, text: `৳${pricing.base} + ৳${pricing.perKm}/km · free within ${pricing.freeWithinKm} km · up to ${pricing.maxDistanceKm} km` },
                  { value: "garage", title: "I'll bring the car in", icon: StoreIcon, text: shop.address ? `No travel charge · ${shop.address}` : "No travel charge" },
                ].map((opt) => {
                  const on = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMode(opt.value)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${on ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <opt.icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">{opt.title}</span>
                        <span className="block text-xs text-slate-500">{opt.text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {mode === "home" && (
                <div className="mt-4 text-sm" data-testid="trip-estimate">
                  {here.status === "locating" && <p className="text-slate-500">Finding your location…</p>}
                  {here.status === "denied" && (
                    <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
                      We need your location to send the mechanic.{" "}
                      <button className="font-semibold underline" onClick={() => setHere({ status: "idle", pos: null })}>
                        Try again
                      </button>{" "}
                      or choose “I'll bring the car in”.
                    </p>
                  )}
                  {here.status === "ok" && tripKm != null && (
                    <p className={`rounded-xl p-3 ${tooFar ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600 ring-1 ring-slate-100"}`}>
                      {tooFar ? (
                        <>You're {km(tripKm)} away – {shop.shopname} only travels up to {pricing.maxDistanceKm} km. Bring the car in or pick a closer garage.</>
                      ) : (
                        <>
                          You're <b className="text-ink-900">{km(tripKm)}</b> away · travel charge <b className="text-ink-900">{travelWaived ? "waived (follow-up)" : travelFee ? money(travelFee) : "free"}</b>. Your location is shared with the mechanic after they accept, while this site is open.
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {parent && (
            <div data-testid="follow-up-banner" className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <Stethoscope className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <p>
                <b>Follow-up to inspection MM-{parent.number}.</b> {parent.findings?.note && <>“{parent.findings.note}” </>}
                The recommended services are selected below.
                {travelWaived && <> No travel charge this time – it was paid with the inspection.</>}
              </p>
            </div>
          )}
          <h2 className="flex items-center gap-2 text-xl font-bold">
            {role !== "mechanic" && <span className="grid size-7 place-items-center rounded-full bg-ink-900 text-sm text-white">3</span>}
            What needs fixing?
          </h2>
          <p className="mt-1 text-sm text-slate-500">Select one or more services – prices are fixed by the shop. Don't know the problem? Book an inspection.</p>
          {!parent && (
            <div className="mt-5">
              <InspectionCard fee={inspectionFee} selected={inspection} onToggle={toggleInspection} />
            </div>
          )}
          {shop.services.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">This shop hasn't listed any services yet.</p>
          ) : (
            <motion.ul className="mt-5 space-y-3" initial="hidden" animate="show" variants={stagger(0.05, 0.15)}>
              {shop.services.map((s) => (
                <ServiceCard key={s._id} service={s} selected={selected.includes(s._id)} onToggle={() => toggle(s._id)} />
              ))}
            </motion.ul>
          )}
        </section>

        {/* cart */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShoppingCart className="size-5 text-brand-600" /> Your booking
              {chosen.length > 0 && !inspection && (
                <motion.span key={chosen.length} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                  {chosen.length}
                </motion.span>
              )}
            </h2>

            <ul className="mt-4 space-y-2 text-sm">
              <AnimatePresence initial={false}>
                {chosen.map((s) => (
                  <motion.li
                    key={s._id}
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                    className="flex justify-between gap-4"
                  >
                    <span className="text-slate-600">{s.serviceName}</span>
                    <span className="font-medium text-ink-900 tabular-nums">{money(s.price)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {inspection && (
              <p className="mt-4 flex justify-between gap-4 text-sm" data-testid="cart-inspection">
                <span className="text-slate-600">Inspection – find the problem</span>
                <span className="font-medium text-ink-900 tabular-nums">{money(inspectionFee)}</span>
              </p>
            )}
            {!hasItems && <p className="mt-4 text-sm text-slate-400">Nothing selected yet.</p>}

            {carReady && role !== "mechanic" && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-100">
                <CarTypeIcon type={car.vehicle.type} className="h-4 w-9 shrink-0 text-brand-600" />
                <span className="truncate font-medium text-ink-800">{vehicleLabel(cleanVehicle(car.vehicle))}</span>
              </div>
            )}

            {role !== "mechanic" && (
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">{inspection ? "Inspection fee" : "Services"}</span>
                  <span className="font-medium text-ink-900 tabular-nums">{money(servicesTotal)}</span>
                </div>
                <div className="flex justify-between gap-4" data-testid="cart-travel">
                  <span className="text-slate-500">{mode === "home" ? `Travel charge${tripKm != null ? ` · ${km(tripKm)}` : ""}` : "Travel charge"}</span>
                  <span className="font-medium text-ink-900 tabular-nums">{mode === "home" ? (travelWaived ? "Waived (follow-up)" : tripKm == null ? "—" : travelFee ? money(travelFee) : "Free") : "None (at garage)"}</span>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
              <span className="text-sm font-semibold text-ink-900">Total</span>
              <span className="font-display text-3xl font-bold text-brand-700">
                ৳<AnimatedNumber value={total} />
              </span>
            </div>

            {role === "mechanic" ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">You're logged in as a mechanic. Log in as a car owner to book services.</p>
            ) : (
              <>
                {role === "user" && hasItems && (
                  <Field as="textarea" label="Note for the mechanic (optional)" className="mt-5" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={inspection ? "What happens? e.g. strange noise when braking" : "e.g. Car won't start, I'm near Mirpur 10"} />
                )}
                <Button size="lg" className="mt-5 w-full" disabled={closed || (role === "user" && (!hasItems || !carSupported || homeBlocked))} loading={busy} onClick={book}>
                  {closed ? "Not taking bookings" : role !== "user" ? "Log in to book" : !hasItems ? "Select a service or inspection" : !carReady ? "Add your car details" : homeBlocked ? (tooFar ? "Too far for home service" : "Waiting for your location") : inspection ? "Book inspection" : "Book now"}
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>

      <OrderPlaced open={!!placed} onClose={() => setPlaced(false)} shopname={shop.shopname} order={placed || null} />
    </div>
  );
}
