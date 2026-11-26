import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Banknote, ClipboardList, Mail, RefreshCw, Users, Wrench } from "lucide-react";
import { api } from "../lib/api";
import { date, money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { BarList, ColumnChart } from "../components/charts";
import { PageHeader } from "../components/admin-ui";
import { CarTypeIcon } from "../components/VehiclePicker";
import { AnimatedNumber, Button, StatusBadge } from "../components/ui";
import { fadeUp, stagger } from "../lib/motion";

function Tile({ icon: Icon, label, value, format, hint, to, tone }) {
  const body = (
    <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card group h-full p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
          <Icon className="size-5" />
        </span>
        {to && <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />}
      </div>
      <p className="mt-4 font-display text-3xl font-bold text-ink-900">{value == null ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-slate-200" /> : <AnimatedNumber value={value} format={format} />}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-2 text-xs font-semibold text-amber-600">{hint}</p>}
    </motion.div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <motion.section variants={fadeUp} className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sans text-base font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

const STATUS_ORDER = ["pending", "accepted", "completed", "cancelled"];

export default function Dashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, o] = await Promise.all([api.get("/admin/stats"), api.get("/admin/orders")]);
      setStats(s.data);
      setRecent(o.data.slice(0, 6));
    } catch {
      /* toast handled by interceptor on 401; keep old data otherwise */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const pending = stats?.ordersByStatus?.pending ?? 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${admin.username.split(" ")[0]}`}
        subtitle="Here's what's happening on My Mechanic."
        actions={
          <Button variant="secondary" size="sm" onClick={load} aria-label="Refresh">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={stagger(0.06)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Tile icon={Banknote} label="Revenue (accepted + completed)" value={stats?.revenue} format={(n) => money(n)} tone="bg-brand-50 text-brand-600" />
          </div>
          <Tile icon={ClipboardList} label="Orders" value={stats?.orders} hint={pending ? `${pending} waiting for a mechanic` : undefined} to="/orders" tone="bg-sky-50 text-sky-600" />
          <Tile icon={Wrench} label="Mechanics" value={stats?.mechanics} to="/mechanics" tone="bg-amber-50 text-amber-600" />
          <Tile icon={Users} label="Customers" value={stats?.users} to="/users" tone="bg-violet-50 text-violet-600" />
          <Tile icon={Mail} label="Messages" value={stats?.messages} to="/messages" tone="bg-rose-50 text-rose-600" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Orders" subtitle="Orders placed per month · last 6 months">
            {stats ? <ColumnChart title="Orders per month" data={stats.months.map((m) => ({ label: m.month, value: m.orders }))} /> : <div className="h-[200px] animate-pulse rounded-xl bg-slate-100" />}
          </Panel>
          <Panel title="Revenue" subtitle="Accepted + completed order value per month (৳)">
            {stats ? (
              <ColumnChart
                title="Revenue per month"
                data={stats.months.map((m) => ({ label: m.month, value: m.revenue }))}
                format={(n) => (n >= 1000 ? `৳${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `৳${n}`)}
              />
            ) : (
              <div className="h-[200px] animate-pulse rounded-xl bg-slate-100" />
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Orders by status" subtitle="All time">
            {stats ? (
              <BarList
                items={STATUS_ORDER.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: stats.ordersByStatus[s] ?? 0 }))}
                empty="No orders yet."
              />
            ) : (
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            )}
          </Panel>
          <Panel title="Top garages" subtitle="By number of orders">
            {stats ? (
              <BarList items={stats.topShops.map((s) => ({ label: s.shopname, value: s.orders, hint: money(s.revenue) }))} empty="No orders yet." />
            ) : (
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            )}
          </Panel>
          <Panel
            title="Latest orders"
            action={
              <Link to="/orders" className="text-xs font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            }
          >
            {!recent ? (
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            ) : recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No orders yet.</p>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {recent.map((o) => (
                  <li key={o._id} className="flex items-center gap-3 py-2.5">
                    <CarTypeIcon type={o.vehicle?.type} className="h-5 w-11 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{o.shopname}</p>
                      <p className="truncate text-xs text-slate-500">
                        {o.user?.username ?? "Deleted user"} · {date(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">{money(o.totalPrice)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </motion.div>
    </>
  );
}
