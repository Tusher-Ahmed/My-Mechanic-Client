import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Banknote, BarChart3, CheckCircle2, ClipboardList, Clock, Crown, Flag, Hourglass, Search, Settings, Store, Wrench, XCircle } from "lucide-react";
import SubscriptionPanel, { RenewBanner } from "../components/SubscriptionPanel";
import MechanicRevenue from "../components/MechanicRevenue";
import { useSubscription } from "../lib/subscription";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { money } from "../lib/format";
import { FilterChips, useMyOrders } from "./Account";
import OrderCard from "../components/OrderCard";
import ServiceEditor from "../components/ServiceEditor";
import LocationPicker from "../components/LocationPicker";
import { CarTypeChooser } from "../components/VehiclePicker";
import { EtaPickerModal } from "../components/TripPanel";
import CancelOrderDialog from "../components/CancelOrderDialog";
import FindingsDialog from "../components/FindingsDialog";
import { DEFAULT_TRAVEL_PRICING, travelFeeFor } from "../lib/pricing";

const numericPricing = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Number(v) || 0]));
import { PasswordForm, ProfileForm } from "../components/AccountSettings";
import { GearLoader, TighteningWrench } from "../components/mech";
import { AnimatedNumber, Button, EmptyState, Field, Tabs } from "../components/ui";
import { dur, ease, fadeUp, stagger } from "../lib/motion";

function Stat({ icon: Icon, label, value, format, tone }) {
  return (
    <motion.div variants={fadeUp} className="card flex items-center gap-4 p-5">
      <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold text-ink-900">
          <AnimatedNumber value={value} format={format} />
        </p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </motion.div>
  );
}

function ShopForm() {
  const { account, updateProfile } = useAuth();
  const [form, setForm] = useState({
    shopname: account.shopname,
    address: account.address ?? "",
    services: account.services ?? [],
    inspectionFee: account.inspectionFee ?? 300,
    vehicleTypes: account.vehicleTypes ?? [],
    travelPricing: { ...DEFAULT_TRAVEL_PRICING, ...(account.travelPricing || {}) },
    location: { latitude: account.latitude, longitude: account.longitude },
  });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({
        shopname: form.shopname,
        address: form.address,
        services: form.services.map(({ _id, serviceName, price }) => ({ _id, serviceName, price })),
        inspectionFee: Number(form.inspectionFee) || 0,
        vehicleTypes: form.vehicleTypes,
        travelPricing: numericPricing(form.travelPricing),
        latitude: form.location.latitude,
        longitude: form.location.longitude,
      });
      toast.success("Shop updated – changes are live on the map");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold sm:col-span-2">
          <Store className="size-5 text-brand-600" /> Shop details
        </h3>
        <Field label="Shop name" value={form.shopname} onChange={(e) => setForm({ ...form, shopname: e.target.value })} required />
        <Field label="Address / area" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. Road 4, Mirpur 10" />
      </div>
      <div className="card p-6 sm:p-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Wrench className="size-5 text-brand-600" /> Services & prices
        </h3>
        <div className="mt-5">
          <ServiceEditor value={form.services} onChange={(services) => setForm({ ...form, services })} />
        </div>
      </div>
      <div className="card p-6 sm:p-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Search className="size-5 text-amber-600" /> Inspection fee
        </h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          For customers who don't know what's wrong: you find the problem, they pay this (+ travel) and can then book the fix.
        </p>
        <div className="max-w-56">
          <Field label="Inspection fee (৳)" type="number" min="0" step="10" required value={form.inspectionFee} onChange={(e) => setForm({ ...form, inspectionFee: e.target.value })} />
        </div>
      </div>
      <div className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold">Car types we service</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">Customers filter the map by car type – only selected types can book you.</p>
        <div className="max-w-sm">
          <CarTypeChooser multiple ariaLabel="Car types we service" placeholder="Select car types" value={form.vehicleTypes} onChange={(vehicleTypes) => setForm({ ...form, vehicleTypes })} />
        </div>
        {form.vehicleTypes.length === 0 && <p className="mt-3 text-sm font-medium text-rose-600">Select at least one car type.</p>}
      </div>
<div className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold">Travel charge (home service)</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">Customers who ask you to come to them pay this on top of the services. Free nearby, then base + per km, rounded to ৳10.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["base", "Base charge (৳)"],
            ["perKm", "Per km (৳)"],
            ["freeWithinKm", "Free within (km)"],
            ["maxDistanceKm", "Max distance (km)"],
          ].map(([k, label]) => (
            <Field key={k} label={label} type="number" min="0" step="any" value={form.travelPricing[k]} onChange={(e) => setForm({ ...form, travelPricing: { ...form.travelPricing, [k]: e.target.value } })} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Example: a customer 5 km away pays <b className="text-ink-900">{money(travelFeeFor(numericPricing(form.travelPricing), 5))}</b> travel · 0.5 km away pays{" "}
          <b className="text-ink-900">{money(travelFeeFor(numericPricing(form.travelPricing), 0.5))}</b>.
        </p>
      </div>
      <div className="card p-6 sm:p-8">
        <h3 className="mb-5 text-lg font-semibold">Shop location</h3>
        <LocationPicker value={form.location} onChange={(location) => setForm({ ...form, location })} />
      </div>
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" loading={busy} className="shadow-xl">
          Save shop
        </Button>
      </div>
    </form>
  );
}

export default function MechanicDashboard() {
  const { account } = useAuth();
  const [params, setParams] = useSearchParams();
  const TABS = ["orders", "revenue", "subscription", "shop", "profile"];
  const [tab, setTabState] = useState(() => (TABS.includes(params.get("tab")) ? params.get("tab") : "orders"));
  const setTab = (t) => {
    setTabState(t);
    setParams(t === "orders" ? {} : { tab: t }, { replace: true });
  };
  useEffect(() => {
    const t = params.get("tab");
    if (TABS.includes(t)) setTabState(t);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const { sub } = useSubscription();
  const [filter, setFilter] = useState("all");
  const { orders, setStatus, replace } = useMyOrders();
  const [accepting, setAccepting] = useState(null); // home-service order waiting for an arrival time
  const [acceptBusy, setAcceptBusy] = useState(false);

  const confirmAccept = async (etaMinutes) => {
    setAcceptBusy(true);
    if (await setStatus(accepting, "accepted", { etaMinutes })) toast.success(`Order accepted – the customer expects you in ~${etaMinutes} min`);
    setAcceptBusy(false);
    setAccepting(null);
  };

  const count = (s) => orders?.filter((o) => o.status === s).length ?? 0;
  // services only – travel charges are reported separately in the Revenue tab; cancelled jobs never count
  const earned = orders?.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.servicesTotal ?? o.totalPrice - (o.travelFee ?? 0)), 0) ?? 0;
  const shown = orders?.filter((o) => filter === "all" || o.status === filter) ?? [];

  const act = async (order, status, msg) => {
    if (status === "cancelled") return setCancelling(order); // ask for a reason first
    if (status === "completed" && order.kind === "inspection") return setFinishing(order); // findings first
    if (await setStatus(order, status)) toast.success(msg);
  };
  const [cancelling, setCancelling] = useState(null);
  const [finishing, setFinishing] = useState(null);
  const confirmFindings = async (findings) => {
    if (await setStatus(finishing, "completed", { findings })) {
      toast.success("Inspection finished – the customer can now book the fix");
      setFinishing(null);
    }
  };
  const confirmCancel = async (reason) => {
    const declining = cancelling.status === "pending";
    if (await setStatus(cancelling, "cancelled", { reason })) {
      toast.success(declining ? "Order declined – the customer has been told why" : "Order cancelled – the customer has been told why");
      setCancelling(null);
    }
  };

  const actionsFor = (o) => {
    if (o.status === "pending")
      return (
        <>
          <Button
            variant="success"
            size="sm"
            onClick={() => (o.serviceMode === "home" ? setAccepting(o) : act(o, "accepted", "Order accepted – the customer has been notified"))}
          >
            <CheckCircle2 className="size-4" /> Accept
          </Button>
          <Button variant="danger" size="sm" onClick={() => act(o, "cancelled", "Order declined")}>
            <XCircle className="size-4" /> Decline
          </Button>
        </>
      );
    if (o.status === "accepted")
      return (
        <>
          <Button
            size="sm"
            disabled={!o.verifiedAt}
            title={o.verifiedAt ? undefined : "Verify the customer's code first"}
            onClick={() => act(o, "completed", "Marked as completed")}
          >
            <Flag className="size-4" /> {o.kind === "inspection" ? "Finish inspection" : "Mark completed"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => act(o, "cancelled", "Order cancelled")}>
            Cancel
          </Button>
        </>
      );
    return null;
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease }} className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-2xl bg-ink-900 text-accent-400">
          <TighteningWrench className="size-8" />
        </span>
        <div>
          <p className="text-sm font-semibold text-brand-700">Mechanic dashboard</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{account.shopname}</h1>
        </div>
      </motion.header>

      <div className="mt-8">
        <RenewBanner sub={sub} onOpen={() => setTab("subscription")} />
      </div>

      <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-4" initial="hidden" animate="show" variants={stagger(0.06)}>
        <Stat icon={Hourglass} label="New requests" value={count("pending")} tone="bg-amber-50 text-amber-600" />
        <Stat icon={Clock} label="In progress" value={count("accepted")} tone="bg-sky-50 text-sky-600" />
        <Stat icon={CheckCircle2} label="Completed" value={count("completed")} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Banknote} label="Service revenue" value={earned} format={(n) => money(n)} tone="bg-brand-50 text-brand-600" />
      </motion.div>

      <Tabs
        id="mech-tabs"
        className="mt-10"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "orders", label: "Orders", icon: <ClipboardList className="size-4" />, count: count("pending") || undefined },
          { value: "revenue", label: "Revenue", icon: <BarChart3 className="size-4" /> },
          { value: "subscription", label: "Subscription", icon: <Crown className="size-4" /> },
          { value: "shop", label: "My shop", icon: <Store className="size-4" /> },
          { value: "profile", label: "Profile", icon: <Settings className="size-4" /> },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: dur.standard, ease } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="mt-6">
          {tab === "orders" &&
            (!orders ? (
              <div className="grid h-48 place-items-center">
                <GearLoader label="Loading orders" />
              </div>
            ) : orders.length === 0 ? (
              <EmptyState icon={<ClipboardList className="size-6" />} title="No orders yet">
                New bookings appear here instantly – you'll also get a notification. Make sure your services and location are up to date in "My shop".
              </EmptyState>
            ) : (
              <>
                <FilterChips value={filter} onChange={setFilter} orders={orders} />
                <div className="mt-5 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {shown.map((o) => (
                      <OrderCard key={o._id} order={o} viewer="mechanic" actions={actionsFor(o)} onChange={replace} />
                    ))}
                  </AnimatePresence>
                  {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No {filter} orders.</p>}
                </div>
              </>
            ))}
          {tab === "revenue" && (orders ? <MechanicRevenue orders={orders} /> : <div className="grid h-48 place-items-center"><GearLoader label="Loading" /></div>)}
          {tab === "subscription" && <SubscriptionPanel sub={sub} />}
          {tab === "shop" && <ShopForm />}
          {tab === "profile" && (
            <div className="space-y-6">
              <ProfileForm />
              <PasswordForm />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <CancelOrderDialog
        order={cancelling}
        kind={cancelling?.status === "pending" ? "decline" : "cancel"}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
      />
      <FindingsDialog order={finishing} onClose={() => setFinishing(null)} onConfirm={confirmFindings} />
      <EtaPickerModal
        open={!!accepting}
        onClose={() => setAccepting(null)}
        onConfirm={confirmAccept}
        distanceKm={accepting?.customerDistanceKm}
        busy={acceptBusy}
      />
    </div>
  );
}
