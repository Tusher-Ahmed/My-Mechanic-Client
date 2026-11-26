// Mechanic finishes an inspection: what did you find + which of your services do you recommend.
import { useEffect, useState } from "react";
import { Check, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Modal } from "./ui";
import { orderNo } from "../lib/pricing";
import { money } from "../lib/format";

export default function FindingsDialog({ order, onClose, onConfirm }) {
  const { account } = useAuth();
  const open = !!order;
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNote("");
      setPicked([]);
      setError("");
    }
  }, [open, order?._id]);

  const services = account?.services ?? [];
  const toggle = (id) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const estimate = services.filter((s) => picked.includes(s._id)).reduce((sum, s) => sum + s.price, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (note.trim().length < 3) return setError("Write what you found, so the customer understands the problem.");
    setBusy(true);
    try {
      await onConfirm({ note: note.trim(), serviceIds: picked });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} labelledBy="findings-title" size="md">
      {order && (
        <form onSubmit={submit} className="p-6 sm:p-7" data-testid="findings-dialog">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <Stethoscope className="size-6" />
          </span>
          <h2 id="findings-title" className="mt-4 text-xl font-bold">
            Finish inspection {orderNo(order)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {order.user?.username ?? "The customer"} sees your findings and can book the recommended services in one tap – without paying travel again for 24 hours.
          </p>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-900">What did you find?</span>
            <textarea
              className="input min-h-24 resize-y"
              value={note}
              maxLength={1000}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              placeholder="e.g. Front brake pads are worn out and the engine oil is very old."
              aria-label="What did you find?"
            />
          </label>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-ink-900">Recommended services (optional)</legend>
            {services.length === 0 ? (
              <p className="text-sm text-slate-500">Add services in “My shop” to recommend them here.</p>
            ) : (
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
                {services.map((s) => {
                  const on = picked.includes(s._id);
                  return (
                    <label
                      key={s._id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-150 ${on ? "bg-brand-50 ring-2 ring-brand-300" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}
                    >
                      <input type="checkbox" className="size-4 accent-brand-600" checked={on} onChange={() => toggle(s._id)} />
                      <span className="flex-1 text-ink-900">{s.serviceName}</span>
                      <span className="font-medium tabular-nums text-slate-600">{money(s.price)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {picked.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Estimate for the customer: <b className="text-ink-900">{money(estimate)}</b>
              </p>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Not yet
            </Button>
            <Button type="submit" loading={busy}>
              <Check className="size-4" /> Finish inspection
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
