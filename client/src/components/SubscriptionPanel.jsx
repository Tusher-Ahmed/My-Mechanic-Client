// Mechanic subscription UI: the always-visible renew banner and the "Subscription" tab.
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { AlertTriangle, BadgeCheck, CalendarClock, Check, Crown, Receipt, Sparkles } from "lucide-react";
import { money } from "../lib/format";
import { planDate, startCheckout } from "../lib/subscription";
import { Button } from "./ui";
import { GearLoader } from "./mech";
import { fadeUp, stagger } from "../lib/motion";

/**
 * Shown at the top of the mechanic dashboard on every visit:
 *  - expired / never subscribed → red, can't be dismissed (the garage is hidden from the map)
 *  - ≤ 7 days left → amber "renew early"
 */
export function RenewBanner({ sub, onOpen }) {
  if (!sub) return null;
  const best = sub.prices?.monthly;
  if (!sub.active) {
    const expired = !!sub.endsAt;
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" data-testid="renew-banner"
        className="mb-8 flex flex-col gap-4 rounded-2xl bg-rose-600 p-5 text-white shadow-lg shadow-rose-900/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="font-bold">{expired ? `Your plan expired on ${planDate(sub.endsAt)}` : "Choose a plan to go live"}</p>
            <p className="text-sm text-rose-100">
              Your garage is <b>hidden from the map</b> and customers can't book you.
              {best && (best.kind === "renewal" ? ` Renew now with ${best.discountPercent}% off – ${money(best.amount)}/month.` : ` Start with ${money(best.amount)} for the first month.`)}
            </p>
          </div>
        </div>
        <Button variant="accent" onClick={onOpen} className="shrink-0">
          <Sparkles className="size-4" /> {expired ? "Renew now" : "Choose a plan"}
        </Button>
      </motion.div>
    );
  }
  if (sub.daysLeft <= 7) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} data-testid="renew-banner"
        className="mb-8 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2.5 text-sm">
          <CalendarClock className="size-5 shrink-0" />
          Your plan ends in <b>{sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"}</b> ({planDate(sub.endsAt)}). Renew early – the new period starts when this one ends.
        </p>
        <Button size="sm" variant="dark" onClick={onOpen} className="shrink-0">
          Renew {best?.discountPercent ? `· ${best.discountPercent}% off` : ""}
        </Button>
      </motion.div>
    );
  }
  return null;
}

function PlanCard({ planKey, price, highlight, onBuy, busy }) {
  const perMonth = planKey === "yearly" ? Math.round(price.amount / 12) : null;
  return (
    <motion.div variants={fadeUp} className={`relative flex flex-col rounded-3xl p-6 ring-1 ${highlight ? "bg-ink-900 text-slate-300 ring-ink-900" : "bg-white ring-slate-200"}`} data-testid={`plan-${planKey}`}>
      {highlight && (
        <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-ink-900">
          <Crown className="size-3.5" /> Best value
        </span>
      )}
      <p className={`text-sm font-semibold ${highlight ? "text-brand-300" : "text-brand-700"}`}>{price.label}</p>
      <p className={`mt-2 font-display text-4xl font-bold ${highlight ? "text-white" : "text-ink-900"}`}>
        {money(price.amount)}
        <span className={`ml-1 text-base font-medium ${highlight ? "text-slate-400" : "text-slate-500"}`}>/ {planKey === "yearly" ? "year" : "month"}</span>
      </p>
      {price.amount < price.listPrice && <p className="mt-1 text-sm"><s className="opacity-60">{money(price.listPrice)}</s> <span className={highlight ? "text-accent-300" : "text-emerald-700"}>{price.kind === "intro" ? (planKey === "yearly" ? "first-year price" : "first-month price") : `${price.discountPercent}% loyalty discount`}</span></p>}
      {perMonth && <p className="mt-1 text-xs opacity-70">≈ {money(perMonth)} per month</p>}
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {["Shown on the map to nearby drivers", "Unlimited bookings, no commission", "Live notifications & customer location", `${price.days} days of visibility`].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <Check className={`mt-0.5 size-4 shrink-0 ${highlight ? "text-brand-400" : "text-brand-600"}`} /> {t}
          </li>
        ))}
      </ul>
      <Button className="mt-6 w-full" variant={highlight ? "accent" : "primary"} loading={busy} onClick={onBuy}>
        {price.kind === "renewal" ? "Renew" : "Get started"} · {money(price.amount)}
      </Button>
    </motion.div>
  );
}

export default function SubscriptionPanel({ sub }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  if (!sub) return <div className="grid h-48 place-items-center"><GearLoader label="Loading your plan" /></div>;

  const buy = async (plan) => {
    setBusy(plan);
    await startCheckout(plan, navigate);
    setBusy(null);
  };

  return (
    <div className="space-y-8">
      <div className={`card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${sub.active ? "" : "ring-2 ring-rose-200"}`} data-testid="plan-status">
        <div className="flex items-center gap-4">
          <span className={`grid size-12 place-items-center rounded-2xl ${sub.active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {sub.active ? <BadgeCheck className="size-6" /> : <AlertTriangle className="size-6" />}
          </span>
          <div>
            <p className="font-semibold text-ink-900">{sub.active ? `${sub.plan === "yearly" ? "Yearly" : "Monthly"} plan · active` : sub.endsAt ? "Plan expired" : "No plan yet"}</p>
            <p className="text-sm text-slate-500">
              {sub.active ? `On the map until ${planDate(sub.endsAt)} · ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left` : "Your garage is hidden from the map until you choose a plan."}
            </p>
          </div>
        </div>
      </div>

      <motion.div className="grid gap-5 md:grid-cols-2" initial="hidden" animate="show" variants={stagger(0.08)}>
        <PlanCard planKey="monthly" price={sub.prices.monthly} onBuy={() => buy("monthly")} busy={busy === "monthly"} />
        <PlanCard planKey="yearly" price={sub.prices.yearly} highlight onBuy={() => buy("yearly")} busy={busy === "yearly"} />
      </motion.div>
      {sub.active && <p className="-mt-4 text-center text-xs text-slate-500">Buying now adds the new period after your current plan ends – you never lose days.</p>}

      <div className="card overflow-hidden">
        <h3 className="flex items-center gap-2 border-b border-slate-100 p-5 text-base font-semibold">
          <Receipt className="size-5 text-brand-600" /> Payment history
        </h3>
        {sub.history.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Transaction</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sub.history.map((h) => (
                  <tr key={h._id}>
                    <td className="px-5 py-3 whitespace-nowrap">{planDate(h.paidAt ?? h.createdAt)}</td>
                    <td className="px-5 py-3 capitalize">{h.plan} {h.kind === "intro" ? "· starter" : "· renewal"}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{money(h.amount)}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${h.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{h.status}</span></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{h.tranId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
