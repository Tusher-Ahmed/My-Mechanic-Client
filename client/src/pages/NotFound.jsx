import { motion } from "motion/react";
import { Home, Navigation } from "lucide-react";
import { Car } from "../components/mech";
import { Button } from "../components/ui";
import { ease } from "../lib/motion";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative w-64">
        {/* broken-down car: no driving, a little smoke puff */}
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.9, ease }}>
          <Car driving={false} color="accent" />
        </motion.div>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-6 right-2 size-5 rounded-full bg-slate-300"
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.7, 0], y: -40, x: 10 + i * 6, scale: 1.6 }}
            transition={{ duration: 2.2, delay: 1 + i * 0.6, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </div>
      <p className="mt-8 font-display text-7xl font-bold text-ink-900">404</p>
      <h1 className="mt-2 text-2xl font-bold">Looks like you took a wrong turn</h1>
      <p className="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/">
          <Home className="size-4" /> Back home
        </Button>
        <Button to="/map" variant="secondary">
          <Navigation className="size-4" /> Find a mechanic
        </Button>
      </div>
    </div>
  );
}
