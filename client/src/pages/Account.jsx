import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ClipboardList, Navigation, Settings, XCircle } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNotificationEvents } from "../context/NotificationsContext";
import OrderCard from "../components/OrderCard";
import { PasswordForm, ProfileForm } from "../components/AccountSettings";
import { GearLoader } from "../components/mech";
import { Avatar, Button, EmptyState, Tabs } from "../components/ui";
import { dur, ease } from "../lib/motion";

export const FILTERS = ["all", "pending", "accepted", "completed", "cancelled"];

export function useMyOrders() {
  const [orders, setOrders] = useState(null);
  const load = useCallback(() => {
    api
      .get("/orders/mine")
      .then(({ data }) => setOrders(data))
      .catch((err) => toast.error(errorMessage(err)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // refresh automatically when a notification about an order arrives
  useNotificationEvents((n) => n.type?.startsWith("order_") && load());

  const setStatus = async (order, status) => {
    try {
      const { data } = await api.patch(`/orders/${order._id}/status`, { status });
      setOrders((list) => list.map((o) => (o._id === data._id ? data : o)));
      return data;
    } catch (err) {
      toast.error(errorMessage(err));
      return null;
    }
  };
  return { orders, setStatus, reload: load };
}

export function FilterChips({ value, onChange, orders }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const count = f === "all" ? orders.length : orders.filter((o) => o.status === f).length;
        const active = value === f;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors duration-150 ${active ? "bg-ink-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
          >
            {f} <span className={active ? "text-slate-300" : "text-slate-400"}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Account() {
  const { account } = useAuth();
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const { orders, setStatus } = useMyOrders();

  const cancel = async (order) => {
    if (!window.confirm(`Cancel your order at ${order.shopname}?`)) return;
    if (await setStatus(order, "cancelled")) toast.success("Order cancelled");
  };

  const shown = orders?.filter((o) => filter === "all" || o.status === filter) ?? [];
  const active = orders?.filter((o) => o.status === "pending" || o.status === "accepted").length ?? 0;

  return (
    <div className="container-page py-10 lg:py-14">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease }} className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={account.username} className="size-16 text-xl" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Hi, {account.username.split(" ")[0]}</h1>
            <p className="text-sm text-slate-500">
              {account.email} · {account.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="card px-5 py-3 text-center">
            <p className="font-display text-2xl font-bold text-ink-900">{orders?.length ?? "–"}</p>
            <p className="text-xs text-slate-500">Orders</p>
          </div>
          <div className="card px-5 py-3 text-center">
            <p className="font-display text-2xl font-bold text-brand-600">{orders ? active : "–"}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
        </div>
      </motion.header>

      <Tabs
        id="account-tabs"
        className="mt-10"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "orders", label: "My orders", icon: <ClipboardList className="size-4" /> },
          { value: "settings", label: "Settings", icon: <Settings className="size-4" /> },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: dur.standard, ease } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="mt-6">
          {tab === "orders" ? (
            !orders ? (
              <div className="grid h-48 place-items-center">
                <GearLoader label="Loading your orders" />
              </div>
            ) : orders.length === 0 ? (
              <EmptyState icon={<ClipboardList className="size-6" />} title="No orders yet" action={<Button to="/map"><Navigation className="size-4" /> Find a mechanic</Button>}>
                When you book a service, it shows up here with live status updates.
              </EmptyState>
            ) : (
              <>
                <FilterChips value={filter} onChange={setFilter} orders={orders} />
                <div className="mt-5 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {shown.map((o) => (
                      <OrderCard
                        key={o._id}
                        order={o}
                        viewer="user"
                        actions={
                          o.status === "pending" && (
                            <Button variant="danger" size="sm" onClick={() => cancel(o)}>
                              <XCircle className="size-4" /> Cancel order
                            </Button>
                          )
                        }
                      />
                    ))}
                  </AnimatePresence>
                  {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No {filter} orders.</p>}
                </div>
              </>
            )
          ) : (
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
