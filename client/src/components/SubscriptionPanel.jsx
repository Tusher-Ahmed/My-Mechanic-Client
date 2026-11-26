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
        className="mb-8 flex items-center gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <CalendarClock className="size-5 shrink-0" />
        <span>
          Your plan ends in <b>{sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"}</b> ({planDate(sub.endsAt)}). Renewal opens when it ends
          {best?.discountPercent ? ` – with ${best.discountPercent}% off` : ""}.
        </span>
      </motion.div>
    );
  }
  return null;
}

function PlanCard({ planKey, price, highlight, onBuy, busy, action, current }) {
  const perMonth = planKey === "yearly" ? Math.round(price.amount / 12) : null;
  return (
    <motion.div variants={fadeUp} className={`relative flex flex-col rounded-3xl p-6 ring-1 ${highlight ? "bg-ink-900 text-slate-300 ring-ink-900" : "bg-white ring-slate-200"}`} data-testid={`plan-${planKey}`}>
      {current ? (
        <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
          <BadgeCheck className="size-3.5" /> Your current plan
        </span>
      ) : (
        highlight && (
          <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-accent-400 px-3 py-1 text-xs font-bold text-ink-900">
            <Crown className="size-3.5" /> Best value
          </span>
        )
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
        {action ?? (price.kind === "renewal" ? "Renew" : "Get started")} · {money(price.amount)}
      </Button>
    </motion.div>
  );
}

/** The active plan: what it is, what was paid, the period and how much is left. */
function YourPlan({ sub }) {
  // the paid purchase that covers today (plans stack, so pick the one whose period contains now)
  const now = Date.now();
  const paid = sub.history.filter((h) => h.status === "paid" && h.startsAt && h.endsAt);
  const current = paid.find((h) => new Date(h.startsAt) <= now && new Date(h.endsAt) > now) ?? paid[0];
  const queued = paid.filter((h) => new Date(h.startsAt) > now);
  const start = current ? new Date(current.startsAt) : null;
  const end = new Date(sub.endsAt);
  const periodEnd = current ? new Date(current.endsAt) : end;
  const used = start ? Math.min(1, Math.max(0, (now - start) / (periodEnd - start))) : 0;
  const endingSoon = sub.daysLeft <= 7;

  return (
    <div className={`card overflow-hidden ${endingSoon ? "ring-2 ring-amber-200" : ""}`} data-testid="plan-status">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeCheck className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-700">Your plan</p>
            <p className="font-display text-2xl font-bold text-ink-900">
              {sub.plan === "yearly" ? "Yearly" : "Monthly"} plan · <span className="text-emerald-600">active</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Your garage is on the map until <b className="text-ink-900">{planDate(sub.endsAt)}</b>
              {queued.length > 0 && <> (includes {queued.length} extension{queued.length === 1 ? "" : "s"} already paid)</>}.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className={`font-display text-3xl font-bold ${endingSoon ? "text-amber-600" : "text-ink-900"}`} data-testid="days-left">{sub.daysLeft}</p>
          <p className="text-xs font-medium text-slate-500">day{sub.daysLeft === 1 ? "" : "s"} left</p>
        </div>
      </div>
      {current && (
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Started {planDate(current.startsAt)}</span>
            <span>Paid {money(current.amount)}{current.kind === "intro" ? " (starter price)" : current.kind === "renewal" ? " (loyalty price)" : ""}</span>
            <span>Ends {planDate(current.endsAt)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Plan period used">
            <motion.div className={`h-full rounded-full ${endingSoon ? "bg-amber-500" : "bg-brand-500"}`} initial={{ width: 0 }} animate={{ width: `${Math.max(2, used * 100)}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
      )}
    </div>
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
      {sub.active ? (
        <YourPlan sub={sub} />
      ) : (
        <div className="card flex items-center gap-4 p-6 ring-2 ring-rose-200" data-testid="plan-status">
          <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-ink-900">{sub.endsAt ? `Plan expired on ${planDate(sub.endsAt)}` : "No plan yet"}</p>
            <p className="text-sm text-slate-500">Your garage is hidden from the map until you choose a plan.</p>
          </div>
        </div>
      )}

      {sub.active ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 ring-1 ring-slate-100" data-testid="renew-locked">
          Renewal opens when your plan ends on <b className="text-ink-900">{planDate(sub.endsAt)}</b>
          {sub.prices.monthly.discountPercent ? ` – you'll get ${sub.prices.monthly.discountPercent}% off as a returning customer` : ""}. We'll remind you 7 days and 1 day before.
        </p>
      ) : (
        <motion.div className="grid gap-5 pt-3 md:grid-cols-2" initial="hidden" animate="show" variants={stagger(0.08)}>
          {["monthly", "yearly"].map((key) => (
            <PlanCard key={key} planKey={key} price={sub.prices[key]} highlight={key === "yearly"} onBuy={() => buy(key)} busy={busy === key} />
          ))}
        </motion.div>
      )}

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
