import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Mail, MapPin, Send, Clock } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { Button, Field, Reveal } from "../components/ui";
import { ease, fadeUp, stagger } from "../lib/motion";

const empty = { email: "", subject: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/messages", form);
      setSent(true);
      setForm(empty);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div initial="hidden" animate="show" variants={stagger(0.08)}>
          <motion.span variants={fadeUp} className="eyebrow">
            Contact us
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            We'd love to hear from you
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            Questions, feedback or a problem with an order? Send us a message and we'll get back to you.
          </motion.p>
          <motion.ul variants={fadeUp} className="mt-10 space-y-4">
            {[
              { icon: MapPin, t: "Dhaka, Bangladesh" },
              { icon: Clock, t: "We reply within 24 hours" },
              { icon: Mail, t: "Messages go straight to our admin team" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3 text-ink-800">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
                  <Icon className="size-5" />
                </span>
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <Reveal className="card relative overflow-hidden p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-96 flex-col items-center justify-center text-center">
                {/* paper plane takes off along an arc */}
                <motion.div
                  initial={{ x: -60, y: 40, rotate: -20, opacity: 0 }}
                  animate={{ x: [-60, 0, 0], y: [40, 0, 0], rotate: [-20, 0, 0], opacity: 1 }}
                  transition={{ duration: 0.8, ease, times: [0, 0.7, 1] }}
                  className="grid size-20 place-items-center rounded-3xl bg-brand-600 text-white shadow-xl shadow-brand-900/20"
                >
                  <Send className="size-9" />
                </motion.div>
                <h2 className="mt-6 text-2xl font-bold">Message sent!</h2>
                <p className="mt-2 max-w-xs text-slate-600">Thanks for reaching out. We'll get back to you soon.</p>
                <Button variant="secondary" className="mt-8" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </motion.div>
            ) : (
              <motion.form key="form" exit={{ opacity: 0, y: -8 }} onSubmit={submit} className="space-y-5">
                <Field label="Your email" name="email" type="email" required value={form.email} onChange={set} placeholder="you@example.com" />
                <Field label="Subject" name="subject" required value={form.subject} onChange={set} placeholder="How can we help?" maxLength={150} />
                <Field label="Message" name="message" as="textarea" required value={form.message} onChange={set} placeholder="Write your message…" rows={6} maxLength={3000} />
                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  <Send className="size-4" /> Send message
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </div>
  );
}
