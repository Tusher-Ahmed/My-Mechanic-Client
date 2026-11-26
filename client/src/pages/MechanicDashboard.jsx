import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, ClipboardList, Clock, Flag, Hourglass, Settings, Store, Wrench, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { money } from "../lib/format";
import { FilterChips, useMyOrders } from "./Account";
import OrderCard from "../components/OrderCard";
import ServiceEditor from "../components/ServiceEditor";
import LocationPicker from "../components/LocationPicker";
import { CarTypeChooser } from "../components/VehiclePicker";
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
    vehicleTypes: account.vehicleTypes ?? [],
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
        vehicleTypes: form.vehicleTypes,
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
        <h3 className="text-lg font-semibold">Car types we service</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">Customers filter the map by car type – only selected types can book you.</p>
        <CarTypeChooser multiple value={form.vehicleTypes} onChange={(vehicleTypes) => setForm({ ...form, vehicleTypes })} />
        {form.vehicleTypes.length === 0 && <p className="mt-3 text-sm font-medium text-rose-600">Select at least one car type.</p>}
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
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const { orders, setStatus } = useMyOrders();

  const count = (s) => orders?.filter((o) => o.status === s).length ?? 0;
  const earned = orders?.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.totalPrice, 0) ?? 0;
  const shown = orders?.filter((o) => filter === "all" || o.status === filter) ?? [];

  const act = async (order, status, msg) => {
    if (status === "cancelled" && !window.confirm(order.status === "pending" ? "Decline this order?" : "Cancel this accepted order?")) return;
    if (await setStatus(order, status)) toast.success(msg);
  };

  const actionsFor = (o) => {
    if (o.status === "pending")
      return (
        <>
          <Button variant="success" size="sm" onClick={() => act(o, "accepted", "Order accepted – the customer has been notified")}>
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
          <Button size="sm" onClick={() => act(o, "completed", "Marked as completed")}>
            <Flag className="size-4" /> Mark completed
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

      <motion.div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" initial="hidden" animate="show" variants={stagger(0.06)}>
        <Stat icon={Hourglass} label="New requests" value={count("pending")} tone="bg-amber-50 text-amber-600" />
        <Stat icon={Clock} label="In progress" value={count("accepted")} tone="bg-sky-50 text-sky-600" />
        <Stat icon={CheckCircle2} label="Completed" value={count("completed")} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Banknote} label="Earned" value={earned} format={(n) => money(n)} tone="bg-brand-50 text-brand-600" />
      </motion.div>

      <Tabs
        id="mech-tabs"
        className="mt-10"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "orders", label: "Orders", icon: <ClipboardList className="size-4" />, count: count("pending") || undefined },
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
                      <OrderCard key={o._id} order={o} viewer="mechanic" actions={actionsFor(o)} />
                    ))}
                  </AnimatePresence>
                  {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No {filter} orders.</p>}
                </div>
              </>
            ))}
          {tab === "shop" && <ShopForm />}
          {tab === "profile" && (
            <div className="space-y-6">
              <ProfileForm />
              <PasswordForm />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
