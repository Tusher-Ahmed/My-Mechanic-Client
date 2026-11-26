// Accepted-order "trip" area: arrival time + verification code.
//  - customer: sees the 4-digit code (to tell the mechanic on arrival) and a live arrival countdown
//  - mechanic: sees the arrival time (can update it) and types the customer's code to confirm the client
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { toast } from "sonner";
import { BadgeCheck, Clock, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { clockTime, suggestedEtaMinutes } from "../lib/pricing";
import { shake } from "../lib/motion";
import { Button, Modal } from "./ui";

function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function EtaText({ eta }) {
  const now = useNow();
  if (!eta?.arriveBy) return null;
  const left = Math.ceil((new Date(eta.arriveBy).getTime() - now) / 60_000);
  return left > 0 ? (
    <>
      Arriving in <b className="text-ink-900">~{left} min</b> · by {clockTime(eta.arriveBy)}
    </>
  ) : (
    <>Should be arriving now (expected {clockTime(eta.arriveBy)})</>
  );
}

/** "When can you be there?" – suggested time from the distance + quick choices. */
export function EtaPickerModal({ open, onClose, onConfirm, distanceKm, title = "When can you be there?", confirmLabel = "Accept order", busy }) {
  const suggested = suggestedEtaMinutes(distanceKm ?? 0);
  const options = [...new Set([suggested, 15, 30, 45, 60, 90])].sort((a, b) => a - b);
  const [minutes, setMinutes] = useState(suggested);
  useEffect(() => {
    if (open) setMinutes(suggested);
  }, [open, suggested]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Timer className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {distanceKm != null ? `The customer is about ${distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} away. ` : ""}
          They'll see a live countdown.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Arrival time">
          {options.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              onClick={() => setMinutes(m)}
              className={`relative rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${minutes === m ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
            >
              {m} min
              {m === suggested && <span className={`block text-[10px] font-medium ${minutes === m ? "text-brand-100" : "text-brand-600"}`}>suggested</span>}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          Other:
          <input type="number" min="5" max="480" className="input h-9 w-24" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Minutes" />
          min
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" loading={busy} disabled={!(minutes >= 5 && minutes <= 480)} onClick={() => onConfirm(Math.round(minutes))}>
            <Clock className="size-4" /> {confirmLabel} · {minutes} min
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function VerifyCodeForm({ order, onChange }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scope, animate] = useAnimate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/orders/${order._id}/verify`, { code });
      toast.success("Customer verified – you can start the job");
      onChange?.(data);
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      animate(scope.current, { x: shake.x }, shake.transition);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={scope} onSubmit={submit} className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <KeyRound className="size-4" /> On arrival: ask the customer for their 4-digit code
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••"
          aria-label="Customer's 4-digit code"
          className="input h-12 w-36 text-center font-mono text-2xl font-bold tracking-[0.5em]"
        />
        <Button type="submit" disabled={code.length !== 4} loading={busy}>
          <ShieldCheck className="size-4" /> Verify
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

export default function TripPanel({ order, viewer, onChange }) {
  const [etaOpen, setEtaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (order.status !== "accepted") return null;
  const home = order.serviceMode === "home";

  const updateEta = async (etaMinutes) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/orders/${order._id}/eta`, { etaMinutes });
      toast.success("Arrival time updated – the customer has been notified");
      onChange?.(data);
      setEtaOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 border-t border-slate-100 p-5 pt-4 md:grid-cols-2" data-testid="trip-panel">
      {/* arrival time */}
      {home && order.eta && !order.verifiedAt && (
        <div className="flex items-start justify-between gap-3 self-start rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
          <span className="flex items-center gap-2.5">
            <Clock className="size-5 shrink-0 text-sky-600" />
            <span data-testid="eta">
              <EtaText eta={order.eta} />
            </span>
          </span>
          {viewer === "mechanic" && (
            <button onClick={() => setEtaOpen(true)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100">
              Running late?
            </button>
          )}
        </div>
      )}

      {/* verification */}
      <AnimatePresence mode="wait" initial={false}>
        {order.verifiedAt ? (
          <motion.p
            key="verified"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100"
            data-testid="verified"
          >
            <BadgeCheck className="size-5" /> {viewer === "mechanic" ? "Customer verified" : "Mechanic arrived and verified"} at {clockTime(order.verifiedAt)}
          </motion.p>
        ) : viewer === "user" && order.verificationCode ? (
          <motion.div key="code" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-ink-900 p-4 text-slate-300" data-testid="verification-code">
            <p className="text-xs font-semibold tracking-wide uppercase">Your code for this order</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.35em] text-white">{order.verificationCode}</p>
            <p className="mt-1 text-xs">Tell it to the mechanic when they arrive – it confirms you're the right customer. Don't share it before.</p>
          </motion.div>
        ) : viewer === "mechanic" ? (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <VerifyCodeForm order={order} onChange={onChange} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {viewer === "mechanic" && (
        <EtaPickerModal
          open={etaOpen}
          onClose={() => setEtaOpen(false)}
          onConfirm={updateEta}
          distanceKm={order.customerDistanceKm}
          title="Update arrival time"
          confirmLabel="Update"
          busy={busy}
        />
      )}
    </div>
  );
}
