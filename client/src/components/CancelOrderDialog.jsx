// Styled cancel / decline dialog with a required reason (replaces the browser's confirm box).
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XCircle } from "lucide-react";
import { Button, Modal } from "./ui";
import { orderNo } from "../lib/pricing";
import { dur, ease } from "../lib/motion";

const REASONS = {
  // customer cancelling a pending order
  user: ["Found another mechanic", "The problem is solved", "Taking too long to accept", "Booked by mistake", "Changed my plans"],
  // mechanic declining a new (pending) order
  decline: ["Fully booked right now", "Customer is too far away", "Can't do this service or car", "Shop is closing", "Required parts not in stock"],
  // mechanic cancelling an accepted job
  cancel: ["Customer not reachable by phone", "Customer not at the location", "Customer couldn't give the code", "Parts not available", "Problem is bigger than expected"],
};
const OTHER = "Other";

/**
 * kind: "user" (customer cancels) · "decline" (mechanic, pending) · "cancel" (mechanic, accepted)
 * onConfirm(reason) → Promise
 */
export default function CancelOrderDialog({ order, kind, onClose, onConfirm }) {
  const open = !!order;
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setChoice("");
      setNote("");
      setError("");
    }
  }, [open, order?._id]);

  const isDecline = kind === "decline";
  const verb = isDecline ? "Decline" : "Cancel";
  const reasons = [...(REASONS[kind] ?? REASONS.user), OTHER];
  const other = choice === OTHER;

  const submit = async (e) => {
    e.preventDefault();
    const text = note.trim();
    if (!choice) return setError(`Please choose why you want to ${verb.toLowerCase()} this order.`);
    if (other && text.length < 3) return setError("Please write a short reason.");
    const reason = other ? text : text ? `${choice} – ${text}` : choice;
    setBusy(true);
    try {
      await onConfirm(reason.slice(0, 300));
    } finally {
      setBusy(false);
    }
  };

  const who = kind === "user" ? order?.shopname : order?.user?.username;
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} labelledBy="cancel-title" size="md">
      {order && (
        <form onSubmit={submit} className="p-6 sm:p-7" data-testid="cancel-dialog">
          <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="size-6" />
          </span>
          <h2 id="cancel-title" className="mt-4 text-xl font-bold">
            {verb} order {orderNo(order)}?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {kind === "user"
              ? `${who} will be told why. Nothing is charged for a cancelled order.`
              : isDecline
                ? `${who ?? "The customer"} will be told why, so they can book another garage.`
                : `${who ?? "The customer"} will be told why. A cancelled job never counts towards your revenue.`}
          </p>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-ink-900">Reason</legend>
            <div className="grid gap-2" role="radiogroup">
              {reasons.map((r) => {
                const on = choice === r;
                return (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-150 ${on ? "bg-rose-50 text-ink-900 ring-2 ring-rose-300" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r}
                      checked={on}
                      onChange={() => {
                        setChoice(r);
                        setError("");
                      }}
                      className="size-4 accent-rose-600"
                    />
                    {r}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <AnimatePresence initial={false}>
            {choice && (
              <motion.label
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", transition: { duration: dur.standard, ease } }}
                exit={{ opacity: 0, height: 0 }}
                className="block overflow-hidden"
              >
                <span className="mt-4 mb-1.5 block text-sm font-medium text-ink-800">{other ? "Please explain" : "Anything to add? (optional)"}</span>
                <textarea
                  className="input min-h-20 resize-y"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setError("");
                  }}
                  maxLength={250}
                  placeholder={other ? "Write the reason…" : "e.g. I'm sorry, try again tomorrow"}
                  aria-label={other ? "Reason" : "Extra note"}
                />
              </motion.label>
            )}
          </AnimatePresence>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Keep the order
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700" loading={busy}>
              {verb} order
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
