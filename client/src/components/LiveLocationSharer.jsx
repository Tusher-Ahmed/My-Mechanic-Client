// Customer side of live location: while the customer has an active order with sharing turned on,
// watch the device position and send updates (at most every 10s, or after moving ~25 m).
// Shows a floating pill so the customer always knows sharing is on, with a Stop button.
// Browsers only allow this while the site is open – there is no background tracking on the web.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { MapPinOff, Navigation } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { distanceKm } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useNotificationEvents } from "../context/NotificationsContext";
import { dur, ease } from "../lib/motion";

const MIN_INTERVAL = 10_000;
const MIN_DISTANCE_KM = 0.025;

export default function LiveLocationSharer() {
  const { role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | waiting | sharing | denied | unavailable
  const last = useRef({ at: 0, pos: null });

  const load = useCallback(() => {
    if (role !== "user") return;
    api
      .get("/orders/mine")
      .then(({ data }) => setOrders(data.filter((o) => o.shareLocation && (o.status === "pending" || o.status === "accepted"))))
      .catch(() => {});
  }, [role]);

  useEffect(() => {
    if (role === "user") load();
    else setOrders([]);
  }, [role, load]);
  useNotificationEvents((n) => n.type?.startsWith("order_") && load());
  useEffect(() => {
    // a new booking was just placed on this device
    window.addEventListener("mm:orders-changed", load);
    return () => window.removeEventListener("mm:orders-changed", load);
  }, [load]);

  const ids = orders.map((o) => o._id).join(",");
  useEffect(() => {
    if (!ids) {
      setStatus("idle");
      return;
    }
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("waiting");
    const targets = ids.split(",");
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) };
        const now = Date.now();
        const moved = last.current.pos ? distanceKm(last.current.pos, pos) : Infinity;
        setStatus("sharing");
        if (now - last.current.at < MIN_INTERVAL && moved < MIN_DISTANCE_KM) return;
        last.current = { at: now, pos };
        targets.forEach((id) => api.patch(`/orders/${id}/location`, pos).catch(() => {}));
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [ids]);

  const stop = async () => {
    try {
      await Promise.all(orders.map((o) => api.patch(`/orders/${o._id}/location`, { share: false })));
      setOrders([]);
      toast.success("Location sharing stopped");
      window.dispatchEvent(new Event("mm:orders-changed"));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const accepted = orders.filter((o) => o.status === "accepted");
  const shop = (accepted[0] ?? orders[0])?.shopname;
  const others = orders.length - 1;
  const text =
    status === "denied"
      ? "Location is blocked – allow it in your browser so the mechanic can find you"
      : status === "unavailable"
        ? "Your device can't share its location right now"
        : accepted.length
          ? `Sharing live location with ${shop}${others > 0 ? ` +${others}` : ""}`
          : `Location will be shared when ${shop} accepts`;

  return (
    <AnimatePresence>
      {orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: dur.slow, ease } }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
          className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-2rem)] sm:max-w-sm"
          role="status"
          data-testid="location-sharing"
        >
          <div className={`flex items-center gap-3 rounded-2xl py-2.5 pr-2.5 pl-3.5 text-sm shadow-xl ring-1 ${status === "denied" || status === "unavailable" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-ink-900 text-white ring-white/10"}`}>
            <span className="relative flex size-3 shrink-0">
              {status === "sharing" && accepted.length > 0 && <span className="absolute inset-0 animate-ping-slow rounded-full bg-emerald-400" />}
              <span className={`relative size-3 rounded-full ${status === "denied" || status === "unavailable" ? "bg-amber-500" : accepted.length ? "bg-emerald-400" : "bg-slate-400"}`} />
            </span>
            {status === "denied" ? <MapPinOff className="size-4 shrink-0" /> : <Navigation className="size-4 shrink-0 text-brand-300" />}
            <span className="min-w-0 flex-1 leading-snug">{text}</span>
            <button onClick={stop} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${status === "denied" || status === "unavailable" ? "bg-amber-100 hover:bg-amber-200" : "bg-white/10 hover:bg-white/20"}`}>
              Stop
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
