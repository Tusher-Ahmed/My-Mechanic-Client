import { useState } from "react";
import { motion, useAnimate } from "motion/react";
import { toast } from "sonner";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { Gear, TighteningWrench } from "../components/mech";
import { Button, Field } from "../components/ui";
import { ease, fadeUp, shake, stagger } from "../lib/motion";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, animate] = useAnimate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const admin = await login(form.email, form.password);
      toast.success(`Welcome back, ${admin.username}`);
    } catch (err) {
      setError(errorMessage(err));
      animate(scope.current, { x: shake.x }, shake.transition);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* visual side */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="bg-grid-dark absolute inset-0" />
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-500/25 blur-3xl" />
        <svg viewBox="0 0 400 400" className="absolute inset-0 m-auto w-[80%]" aria-hidden>
          <Gear x={210} y={180} teeth={20} size={120} period={40} className="fill-brand-500/20" />
          <Gear x={72} y={300} teeth={11} size={66} period={22} reverse offset={8} className="fill-brand-400/25" />
          <Gear x={332} y={330} teeth={9} size={52} period={18} reverse offset={10} className="fill-accent-400/25" />
        </svg>
        <motion.div initial="hidden" animate="show" variants={stagger(0.1, 0.2)} className="absolute inset-x-12 bottom-14 text-slate-300">
          <motion.div variants={fadeUp} className="mb-6 grid size-16 place-items-center rounded-2xl bg-white/10 text-accent-400">
            <TighteningWrench className="size-8" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white">
            Keep the garage running.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 max-w-md text-lg">
            Manage customers, mechanics, orders and messages for My Mechanic – all in one place.
          </motion.p>
        </motion.div>
      </div>

      {/* form side */}
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="w-full max-w-sm">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-900/20">
            <LockKeyhole className="size-6" />
          </span>
          <h1 className="mt-6 text-3xl font-bold">Admin login</h1>
          <p className="mt-1 text-slate-500">Sign in to the My Mechanic admin panel.</p>

          <form ref={scope} onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Log in
            </Button>
          </form>
          <p className="mt-8 text-xs text-slate-400">The first admin is created with <code className="rounded bg-slate-100 px-1">npm run seed:admin</code> on the server.</p>
        </motion.div>
      </div>
    </div>
  );
}
