// The garage's own business: service revenue, travel (transport) charges and orders per month.
// Service revenue and travel charges are always kept apart. Only completed jobs count – never cancelled ones.
import { useMemo } from "react";
import { motion } from "motion/react";
import { Banknote, CheckCircle2, Truck, TrendingUp } from "lucide-react";
import { money } from "../lib/format";
import { BarList, ColumnChart } from "./charts";
import { AnimatedNumber } from "./ui";
import { fadeUp, stagger } from "../lib/motion";

const MONTHS = 6;
const servicesOf = (o) => o.servicesTotal ?? o.totalPrice - (o.travelFee ?? 0);
const short = (n) => (n >= 1000 ? `৳${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `৳${n}`);

export default function MechanicRevenue({ orders }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), orders: 0, services: 0, travel: 0 };
    });
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    const done = orders.filter((o) => o.status === "completed");
    const perService = {};
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m && o.status !== "cancelled") m.orders++;
    }
    for (const o of done) {
      const d = new Date(o.updatedAt ?? o.createdAt);
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m) {
        m.services += servicesOf(o);
        m.travel += o.travelFee ?? 0;
      }
      for (const s of o.services) perService[s.serviceName] = (perService[s.serviceName] ?? 0) + s.price;
    }
    const services = done.reduce((sum, o) => sum + servicesOf(o), 0);
    const travel = done.reduce((sum, o) => sum + (o.travelFee ?? 0), 0);
    const homeJobs = done.filter((o) => o.serviceMode === "home").length;
    return {
      months,
      services,
      travel,
      servicesThisMonth: months[MONTHS - 1].services,
      travelThisMonth: months[MONTHS - 1].travel,
      jobs: done.length,
      homeJobs,
      top: Object.entries(perService)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value })),
    };
  }, [orders]);

  const tiles = [
    { icon: Banknote, label: "Service revenue this month", value: data.servicesThisMonth, format: money, tone: "bg-brand-50 text-brand-600", testid: "rev-services-month" },
    { icon: Truck, label: "Travel charges this month", value: data.travelThisMonth, format: money, tone: "bg-sky-50 text-sky-600", testid: "rev-travel-month" },
    { icon: TrendingUp, label: "Total service revenue", value: data.services, format: money, tone: "bg-emerald-50 text-emerald-600", testid: "rev-services-total" },
    { icon: CheckCircle2, label: "Completed jobs", value: data.jobs, tone: "bg-amber-50 text-amber-600", testid: "rev-jobs" },
  ];

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={stagger(0.06)} data-testid="mechanic-revenue">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <motion.div key={t.label} variants={fadeUp} className="card flex min-w-0 items-center gap-4 p-5" data-testid={t.testid}>
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
          <h3 className="font-sans text-base font-bold">Service revenue</h3>
          <p className="mb-4 text-xs text-slate-500">Completed jobs, services only · last 6 months</p>
          <ColumnChart title="Service revenue per month" data={data.months.map((m) => ({ label: m.label, value: m.services }))} format={short} />
        </motion.section>
        <motion.section variants={fadeUp} className="card min-w-0 p-5 sm:p-6" data-testid="travel-section">
          <h3 className="flex items-center gap-2 font-sans text-base font-bold">
            <Truck className="size-4 text-sky-600" /> Travel charges
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Transport for home-service jobs, kept separate from service revenue · total {money(data.travel)} from {data.homeJobs} home job{data.homeJobs === 1 ? "" : "s"}
          </p>
          <ColumnChart title="Travel charges per month" data={data.months.map((m) => ({ label: m.label, value: m.travel }))} format={short} />
        </motion.section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section variants={fadeUp} className="card min-w-0 p-5 sm:p-6">
          <h3 className="font-sans text-base font-bold">Orders</h3>
          <p className="mb-4 text-xs text-slate-500">Bookings received (excluding cancelled) · last 6 months</p>
          <ColumnChart title="Orders per month" data={data.months.map((m) => ({ label: m.label, value: m.orders }))} />
        </motion.section>
        <motion.section variants={fadeUp} className="card min-w-0 p-5 sm:p-6">
          <h3 className="mb-4 font-sans text-base font-bold">What earns you the most</h3>
          <BarList items={data.top} format={money} empty="Complete your first job to see this." />
        </motion.section>
      </div>
    </motion.div>
  );
}
