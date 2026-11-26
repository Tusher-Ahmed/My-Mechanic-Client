import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";
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
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set} required />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set} required error={mismatch ? "Passwords don't match" : undefined} />
      </div>
      <Button type="submit" variant="dark" className="mt-6" loading={busy} disabled={!form.currentPassword || !form.newPassword || mismatch}>
        Update password
      </Button>
    </form>
  );
}
