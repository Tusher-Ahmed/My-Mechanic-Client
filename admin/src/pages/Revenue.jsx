// Platform revenue = mechanic subscriptions (the platform takes no commission on orders).
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, Banknote, CalendarClock, CalendarDays, Save, Store, TrendingDown, TrendingUp } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { date, money } from "../lib/format";
import { BarList, ColumnChart } from "../components/charts";
import { PageHeader } from "../components/admin-ui";
import { AnimatedNumber, Button, Field } from "../components/ui";
import { fadeUp, stagger } from "../lib/motion";

const shortDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <motion.section variants={fadeUp} className={`card min-w-0 p-5 sm:p-6 ${className}`}>
      <h2 className="font-sans text-base font-bold text-ink-900">{title}</h2>
      {subtitle && <p className="mb-4 text-xs text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </motion.section>
  );
}

function GarageList({ items, empty, tone, show }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="-my-2 divide-y divide-slate-100">
      {items.slice(0, 8).map((g) => (
        <li key={g._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink-900">{g.shopname}</span>
            <span className="block truncate text-xs text-slate-500">{g.username}</span>
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{show(g)}</span>
        </li>
      ))}
      {items.length > 8 && <li className="pt-2 text-center text-xs text-slate-400">+{items.length - 8} more</li>}
    </ul>
  );
}

function PlanEditor() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/admin/plans").then(({ data }) => setForm(data)).catch((err) => toast.error(errorMessage(err)));
  }, []);
  if (!form) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;

  const setPlan = (key, field) => (e) => setForm((f) => ({ ...f, plans: { ...f.plans, [key]: { ...f.plans[key], [field]: e.target.value } } }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/admin/plans", form);
      setForm(data);
      toast.success("Plan prices saved – new checkouts use them right away");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5" data-testid="plan-editor">
      {["monthly", "yearly"].map((key) => (
        <div key={key} className="grid gap-3 sm:grid-cols-4">
          <Field label={`${form.plans[key].label} – price ৳`} type="number" min="0" value={form.plans[key].price} onChange={setPlan(key, "price")} />
          <Field label="First-period price ৳" type="number" min="0" value={form.plans[key].introPrice} onChange={setPlan(key, "introPrice")} />
          <Field label="Days" type="number" min="1" value={form.plans[key].days} onChange={setPlan(key, "days")} />
          <Field label="Label" value={form.plans[key].label} onChange={setPlan(key, "label")} />
        </div>
      ))}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Field
            label="Returning-customer discount %"
            type="number"
            min="0"
            max="90"
            className="w-56"
            value={form.renewalDiscountPercent}
            onChange={(e) => setForm((f) => ({ ...f, renewalDiscountPercent: e.target.value }))}
          />
          <Field
            label="Free trial for new garages (days)"
            hint="Starts when a garage is approved · 0 = no trial"
            type="number"
            min="0"
            max="90"
            className="w-56"
            value={form.trialDays ?? 7}
            onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
          />
        </div>
        <Button type="submit" loading={busy}>
          <Save className="size-4" /> Save prices
        </Button>
      </div>
    </form>
  );
}

export default function Revenue() {
  const [r, setR] = useState(null);
  const load = useCallback(() => api.get("/admin/revenue").then(({ data }) => setR(data)).catch((err) => toast.error(errorMessage(err))), []);
  useEffect(() => {
    load();
  }, [load]);

  const change = r ? (r.lastMonth ? Math.round(((r.thisMonth - r.lastMonth) / r.lastMonth) * 100) : null) : null;
  const tiles = r && [
    { icon: Banknote, label: "All-time subscription income", value: r.allTime.revenue, format: money, hint: `${r.allTime.payments} payments`, tone: "bg-brand-50 text-brand-600" },
    {
      icon: CalendarDays,
      label: "This month",
      value: r.thisMonth,
      format: money,
      hint: change == null ? `Last month ${money(r.lastMonth)}` : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs last month`,
      tone: "bg-sky-50 text-sky-600",
    },
    { icon: Store, label: "Garages on the map", value: r.garages.active, hint: `of ${r.garages.total} registered`, tone: "bg-emerald-50 text-emerald-600" },
    { icon: CalendarClock, label: "Expiring in 7 days", value: r.garages.expiringSoon.length, hint: `${r.garages.expired.length} already expired`, tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <>
      <PageHeader title="Revenue" subtitle="Platform income from mechanic subscriptions (demo payments). Order payments go directly to the garages." />
      {!r ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />)}
        </div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={stagger(0.06)} className="space-y-6" data-testid="revenue-page">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((t) => (
              <motion.div key={t.label} variants={fadeUp} className="card min-w-0 p-5">
                <span className={`grid size-11 place-items-center rounded-2xl ${t.tone}`}>
                  <t.icon className="size-5" />
                </span>
                <p className="mt-4 font-display text-2xl font-bold text-ink-900">
                  <AnimatedNumber value={t.value} format={t.format} />
                </p>
                <p className="text-sm font-medium text-slate-500">{t.label}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  {t.label === "This month" && change != null && (change >= 0 ? <TrendingUp className="size-3.5 text-emerald-600" /> : <TrendingDown className="size-3.5 text-rose-600" />)}
                  {t.hint}
                </p>
              </motion.div>
            ))}
          </div>

          <Panel title="Subscription income" subtitle="Paid plans per month · last 12 months (৳)">
            <ColumnChart
              title="Subscription income per month"
              height={220}
              data={r.months.map((m) => ({ label: m.month, value: m.revenue }))}
              format={(n) => (n >= 1000 ? `৳${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `৳${n}`)}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="By plan" subtitle="All time">
              <BarList items={r.byPlan.map((p) => ({ label: p.plan === "yearly" ? "Yearly" : "Monthly", value: p.revenue, hint: `${p.count} paid` }))} format={money} empty="No payments yet." />
            </Panel>
            <Panel title="New vs returning" subtitle="Starter price vs loyalty renewals">
              <BarList items={r.byKind.map((k) => ({ label: k.kind === "intro" ? "New garages (starter)" : "Renewals (discount)", value: k.revenue, hint: `${k.count} paid` }))} format={money} empty="No payments yet." />
            </Panel>
            <Panel title="Expiring soon" subtitle="Plans ending within 7 days">
              <GarageList items={r.garages.expiringSoon} empty="Nothing expiring this week." tone="bg-amber-50 text-amber-700" show={(g) => shortDate(g.endsAt)} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Hidden from the map" subtitle="Expired or never subscribed – reminders are sent automatically">
              <GarageList
                items={[...r.garages.expired, ...r.garages.neverSubscribed]}
                empty="Every garage has an active plan."
                tone="bg-rose-50 text-rose-700"
                show={(g) => (g.endsAt ? `expired ${shortDate(g.endsAt)}` : "no plan yet")}
              />
            </Panel>
            <Panel title="Recent payments">
              {r.recent.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No payments yet.</p>
              ) : (
                <ul className="-my-2 divide-y divide-slate-100" data-testid="recent-payments">
                  {r.recent.slice(0, 8).map((p) => (
                    <li key={p._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink-900">{p.shopname}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {p.plan} · {p.kind === "intro" ? "starter" : "renewal"} · {date(p.paidAt)}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Plan prices" subtitle="Changes apply to new checkouts. Existing plans keep their end dates.">
            <PlanEditor />
          </Panel>

          <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <AlertTriangle className="size-3.5" /> Payments are simulated (demo checkout) – no real money is collected yet.
          </p>
        </motion.div>
      )}
    </>
  );
}
