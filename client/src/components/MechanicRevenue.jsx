// The garage's own business: orders and revenue per month (from its completed orders).
import { useMemo } from "react";
import { motion } from "motion/react";
import { Banknote, CheckCircle2, ClipboardList, TrendingUp } from "lucide-react";
import { money } from "../lib/format";
import { BarList, ColumnChart } from "./charts";
import { AnimatedNumber } from "./ui";
import { fadeUp, stagger } from "../lib/motion";

const MONTHS = 6;

export default function MechanicRevenue({ orders }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), orders: 0, revenue: 0 };
    });
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    const done = orders.filter((o) => o.status === "completed");
    const services = {};
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m && o.status !== "cancelled") m.orders++;
    }
    for (const o of done) {
      const d = new Date(o.updatedAt ?? o.createdAt);
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m) m.revenue += o.totalPrice;
      for (const s of o.services) services[s.serviceName] = (services[s.serviceName] ?? 0) + s.price;
      if (o.travelFee) services["Travel charges"] = (services["Travel charges"] ?? 0) + o.travelFee;
    }
    const total = done.reduce((sum, o) => sum + o.totalPrice, 0);
    return {
      months,
      total,
      thisMonth: months[MONTHS - 1].revenue,
      jobs: done.length,
      avg: done.length ? Math.round(total / done.length) : 0,
      top: Object.entries(services)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value })),
    };
  }, [orders]);

  const tiles = [
    { icon: Banknote, label: "Revenue this month", value: data.thisMonth, format: money, tone: "bg-brand-50 text-brand-600" },
    { icon: TrendingUp, label: "Total revenue", value: data.total, format: money, tone: "bg-emerald-50 text-emerald-600" },
    { icon: CheckCircle2, label: "Completed jobs", value: data.jobs, tone: "bg-sky-50 text-sky-600" },
    { icon: ClipboardList, label: "Average job value", value: data.avg, format: money, tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={stagger(0.06)} data-testid="mechanic-revenue">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <motion.div key={t.label} variants={fadeUp} className="card flex min-w-0 items-center gap-4 p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${t.tone}`}>
              <t.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold text-ink-900">
                <AnimatedNumber value={t.value} format={t.format} />
              </p>
              <p className="truncate text-xs font-medium text-slate-500">{t.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section variants={fadeUp} className="card min-w-0 p-5 sm:p-6">
          <h3 className="font-sans text-base font-bold">Revenue</h3>
          <p className="mb-4 text-xs text-slate-500">Completed jobs (services + travel) · last 6 months</p>
          <ColumnChart title="Revenue per month" data={data.months.map((m) => ({ label: m.label, value: m.revenue }))} format={(n) => (n >= 1000 ? `৳${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `৳${n}`)} />
        </motion.section>
        <motion.section variants={fadeUp} className="card min-w-0 p-5 sm:p-6">
          <h3 className="font-sans text-base font-bold">Orders</h3>
          <p className="mb-4 text-xs text-slate-500">Bookings received (excluding cancelled) · last 6 months</p>
          <ColumnChart title="Orders per month" data={data.months.map((m) => ({ label: m.label, value: m.orders }))} />
        </motion.section>
      </div>
      <motion.section variants={fadeUp} className="card p-5 sm:p-6">
        <h3 className="mb-4 font-sans text-base font-bold">What earns you the most</h3>
        <BarList items={data.top} format={money} empty="Complete your first job to see this." />
      </motion.section>
    </motion.div>
  );
}
