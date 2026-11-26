import { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { CarFront, KeyRound, Plus, Trash2, UserRound } from "lucide-react";
import { CarTypeIcon, VehicleForm, cleanVehicle, isVehicleComplete } from "./VehiclePicker";
import { emptyVehicle, vehicleKey } from "../data/vehicles";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { Button, Field } from "./ui";

export function ProfileForm() {
  const { account, updateProfile } = useAuth();
  const [form, setForm] = useState({ username: account.username, phone: account.phone ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <UserRound className="size-5 text-brand-600" /> Profile
      </h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="username" value={form.username} onChange={set} required />
        <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={set} required />
        <Field label="Email" value={account.email} disabled hint="Email can't be changed" className="sm:col-span-2" readOnly />
      </div>
      <Button type="submit" className="mt-6" loading={busy}>
        Save changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const mismatch = form.confirm && form.newPassword !== form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    try {
      await updateProfile({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success("Password changed");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="size-5 text-brand-600" /> Change password
      </h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set} required />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={set} required />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set} required error={mismatch ? "Passwords don't match" : undefined} />
      </div>
      <Button type="submit" variant="dark" className="mt-6" loading={busy} disabled={!form.currentPassword || !form.newPassword || mismatch}>
        Update password
      </Button>
    </form>
  );
}

/** Customer's saved cars (max 5) – used to prefill bookings. */
export function MyCarsForm() {
  const { account, updateProfile } = useAuth();
  const cars = account.vehicles ?? [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...emptyVehicle });
  const [busy, setBusy] = useState(false);

  const save = async (vehicles, message) => {
    setBusy(true);
    try {
      await updateProfile({ vehicles });
      toast.success(message);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!isVehicleComplete(draft)) return toast.error("Choose the car type and enter make and model.");
    if (await save([cleanVehicle(draft), ...cars], "Car saved")) {
      setDraft({ ...emptyVehicle });
      setAdding(false);
    }
  };
  const remove = (i) => save(cars.filter((_, idx) => idx !== i), "Car removed");

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <CarFront className="size-5 text-brand-600" /> My cars
        </h3>
        {!adding && cars.length < 5 && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add car
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">Saved cars are pre-filled when you book. You can save up to 5.</p>

      <ul className="mt-5 space-y-2">
        <AnimatePresence initial={false}>
          {cars.map((v, i) => (
            <motion.li key={vehicleKey(v)} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
                <CarTypeIcon type={v.type} className="h-6 w-14 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {v.make} {v.model}
                  </p>
                  <p className="truncate text-xs text-slate-500">{[v.type, v.year, v.plate].filter(Boolean).join(" · ")}</p>
                </div>
                <button onClick={() => remove(i)} disabled={busy} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${v.make} ${v.model}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {cars.length === 0 && !adding && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No saved cars yet.</p>}

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:p-5">
              <VehicleForm value={draft} onChange={setDraft} idPrefix="mycar" />
              <div className="mt-5 flex gap-2">
                <Button size="sm" onClick={add} loading={busy}>
                  Save car
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
