import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAnimate } from "motion/react";
import { toast } from "sonner";
import { Car, Wrench } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { shake } from "../lib/motion";
import { Button, Field, Modal, Tabs } from "./ui";

const empty = { username: "", email: "", phone: "", password: "" };

export default function AuthDialog() {
  const { dialog, closeAuth, openAuth, login, register } = useAuth();
  const [form, setForm] = useState(empty);
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, animate] = useAnimate();

  const mode = dialog?.mode ?? "login";
  useEffect(() => {
    if (dialog) {
      setRole(dialog.role ?? "user");
      setError("");
    }
  }, [dialog]);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const fail = (msg) => {
    setError(msg);
    if (scope.current) animate(scope.current, { x: shake.x }, shake.transition);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const { account } = await login(role, { email: form.email, password: form.password });
        toast.success(`Welcome back, ${account.username.split(" ")[0]}!`);
      } else {
        const { account } = await register("user", form);
        toast.success(`Welcome to My Mechanic, ${account.username.split(" ")[0]}!`);
      }
      setForm(empty);
      closeAuth();
    } catch (err) {
      fail(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!dialog} onClose={closeAuth} labelledBy="auth-title">
      <div className="p-6 sm:p-8">
        <h2 id="auth-title" className="text-2xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login" ? "Log in to book services and track your orders." : "Book trusted mechanics near you in minutes."}
        </p>

        {mode === "login" && (
          <Tabs
            id="auth-role"
            className="mt-6 grid w-full grid-cols-2"
            value={role}
            onChange={setRole}
            tabs={[
              { value: "user", label: "Car owner", icon: <Car className="size-4" /> },
              { value: "mechanic", label: "Mechanic", icon: <Wrench className="size-4" /> },
            ]}
          />
        )}

        <form ref={scope} onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {mode === "register" && (
            <>
              <Field label="Full name" name="username" value={form.username} onChange={set} autoComplete="name" required placeholder="Rahim Uddin" />
              <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={set} autoComplete="tel" required placeholder="01XXXXXXXXX" />
            </>
          )}
          <Field label="Email" name="email" type="email" value={form.email} onChange={set} autoComplete="email" required placeholder="you@example.com" />
          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={set}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            hint={mode === "register" ? "At least 8 characters, with a letter and a number" : undefined}
            placeholder="••••••••"
          />

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {mode === "login" ? `Log in as ${role === "mechanic" ? "mechanic" : "car owner"}` : "Create account"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <p>
              New here?{" "}
              <button className="font-semibold text-brand-700 hover:underline" onClick={() => openAuth("register")}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button className="font-semibold text-brand-700 hover:underline" onClick={() => openAuth("login")}>
                Log in
              </button>
            </p>
          )}
          <p>
            Own a garage?{" "}
            <Link to="/mechanic/register" onClick={closeAuth} className="font-semibold text-brand-700 hover:underline">
              Register as a mechanic
            </Link>
          </p>
        </div>
      </div>
    </Modal>
  );
}
