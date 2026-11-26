// Demo checkout – looks like a payment page but no real money moves.
// When a real gateway is added, the mechanic would be redirected there instead of here.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CreditCard, FlaskConical, Lock, PartyPopper, Smartphone, Wallet } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { money } from "../lib/format";
import { planDate } from "../lib/subscription";
import { Button, EmptyState } from "../components/ui";
import { GearLoader } from "../components/mech";
import { ease } from "../lib/motion";

const METHODS = [
  { key: "bkash", label: "bKash", icon: Smartphone },
  { key: "nagad", label: "Nagad", icon: Wallet },
  { key: "card", label: "Card", icon: CreditCard },
];

export default function DemoCheckout() {
  const { tranId } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("bkash");
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api
      .get(`/subscriptions/checkout/${tranId}`)
      .then(({ data }) => setSub(data))
      .catch((err) => setError(errorMessage(err)));
  }, [tranId]);

  const pay = async (outcome) => {
    setBusy(outcome);
    try {
      const { data } = await api.post(`/subscriptions/demo/${tranId}/pay`, { outcome });
      if (outcome === "success") setDone(data);
      else {
        toast("Payment cancelled – no plan was activated.");
        navigate("/mechanic?tab=subscription");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (error)
    return (
      <div className="container-page py-20">
        <EmptyState icon={<Lock className="size-6" />} title="Payment not available" action={<Button to="/mechanic?tab=subscription">Back to my plan</Button>}>
          {error}
        </EmptyState>
      </div>
    );
  if (!sub) return <div className="grid min-h-[60vh] place-items-center"><GearLoader label="Opening checkout" /></div>;

  const settled = sub.status !== "pending";
  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="card w-full max-w-md overflow-hidden" data-testid="demo-checkout">
        <div className="flex items-center justify-between bg-ink-900 px-6 py-4 text-white">
          <span className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-brand-400" /> Secure checkout</span>
          <span className="flex items-center gap-1.5 rounded-full bg-accent-400 px-2.5 py-1 text-xs font-bold text-ink-900">
            <FlaskConical className="size-3.5" /> Demo payment – no real money
          </span>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="p-8 text-center">
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}
                className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500 text-white shadow-lg">
                <PartyPopper className="size-8" />
              </motion.span>
              <h1 className="mt-5 text-2xl font-bold">Payment successful</h1>
              <p className="mt-2 text-slate-600">
                {sub.shopname} is on the map until <b>{planDate(done.endsAt)}</b>.
              </p>
              <Button className="mt-8 w-full" size="lg" to="/mechanic">Go to my dashboard</Button>
            </motion.div>
          ) : (
            <motion.div key="pay" exit={{ opacity: 0 }} className="p-6">
              <p className="text-sm text-slate-500">{sub.shopname}</p>
              <h1 className="mt-1 text-xl font-bold">My Mechanic · {sub.plan === "yearly" ? "Yearly" : "Monthly"} plan</h1>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Plan price</span><span className={sub.amount < sub.listPrice ? "text-slate-400 line-through" : ""}>{money(sub.listPrice)}</span></div>
                {sub.amount < sub.listPrice && (
                  <div className="mt-1 flex justify-between text-sm"><span className="text-emerald-700">{sub.kind === "intro" ? "Starter price" : "Loyalty discount"}</span><span className="text-emerald-700">−{money(sub.listPrice - sub.amount)}</span></div>
                )}
                <div className="mt-3 flex justify-between border-t border-dashed border-slate-200 pt-3"><span className="font-semibold">To pay</span><span className="font-display text-2xl font-bold text-brand-700" data-testid="checkout-amount">{money(sub.amount)}</span></div>
                <p className="mt-1 text-xs text-slate-500">{sub.days} days on the map · transaction {sub.tranId}</p>
              </div>

              <p className="mt-5 mb-2 text-sm font-semibold text-ink-900">Pay with</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
                {METHODS.map((m) => (
                  <button key={m.key} type="button" role="radio" aria-checked={method === m.key} onClick={() => setMethod(m.key)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition-colors ${method === m.key ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                    <m.icon className="size-5" /> {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Demo only – nothing is charged to {METHODS.find((m) => m.key === method).label}.</p>

              {settled ? (
                <p className="mt-6 rounded-xl bg-slate-100 p-3 text-center text-sm text-slate-600">This payment is already {sub.status}.</p>
              ) : (
                <div className="mt-6 space-y-2">
                  <Button className="w-full" size="lg" loading={busy === "success"} disabled={!!busy} onClick={() => pay("success")}>
                    <Lock className="size-4" /> Pay {money(sub.amount)}
                  </Button>
                  <Button className="w-full" variant="ghost" loading={busy === "cancel"} disabled={!!busy} onClick={() => pay("cancel")}>
                    Cancel payment
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
