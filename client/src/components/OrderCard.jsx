import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Calendar, Mail, MapPin, MessageSquareText, Phone, Store, UserRound } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "./ui";
import { CarTypeIcon } from "./VehiclePicker";
import { date, km, money } from "../lib/format";
import { fadeUp } from "../lib/motion";

/** One order. `viewer` = "user" (sees the shop) or "mechanic" (sees the customer). */
// The map library is only downloaded when a mechanic actually has a live location to show.
// Loaded with a plain dynamic import (not React.lazy): suspending inside the page-transition
// animation left the whole page stuck at opacity 0.
let mapModule = null;
function useCustomerLocationMap(needed) {
  const [Comp, setComp] = useState(() => mapModule);
  useEffect(() => {
    if (!needed || Comp) return;
    let alive = true;
    import("./CustomerLocationMap").then((m) => {
      mapModule = m.default;
      if (alive) setComp(() => m.default);
    });
    return () => {
      alive = false;
    };
  }, [needed, Comp]);
  return Comp;
}

export default function OrderCard({ order, viewer, actions }) {
  const { account } = useAuth();
  const shop = viewer === "mechanic" ? { latitude: account?.latitude, longitude: account?.longitude } : null;
  const showLiveMap = viewer === "mechanic" && order.status === "accepted" && order.shareLocation && !!order.customerLocation;
  const showArea = viewer === "mechanic" && order.status === "pending" && !!order.approxLocation;
  const CustomerLocationMap = useCustomerLocationMap(showLiveMap || showArea);
  const other = viewer === "user" ? order.mechanic : order.user;
  const hasContact = !!other?.phone;

  return (
    <motion.article layout variants={fadeUp} initial="hidden" animate="show" exit="exit" className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            {viewer === "user" ? <Store className="size-5" /> : <UserRound className="size-5" />}
          </span>
          <div>
            {viewer === "user" ? (
              <Link to={`/store/${order.mechanic?._id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                {order.shopname}
              </Link>
            ) : (
              <p className="font-semibold text-ink-900">{order.user?.username ?? "Customer"}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="size-3.5" /> {date(order.createdAt)} · #{order._id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div>
          {order.vehicle && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100" data-testid="order-vehicle">
              <CarTypeIcon type={order.vehicle.type} className="h-5 w-11 shrink-0 text-brand-600" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-ink-900">
                  {order.vehicle.make} {order.vehicle.model}
                  {order.vehicle.year && <span className="font-normal text-slate-500"> · {order.vehicle.year}</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {order.vehicle.type}
                  {order.vehicle.plate && <> · <span className="font-mono tracking-wide">{order.vehicle.plate}</span></>}
                </p>
              </div>
            </div>
          )}
          <ul className="space-y-1.5 text-sm">
            {order.services.map((s, i) => (
              <li key={i} className="flex justify-between gap-6">
                <span className="text-slate-600">{s.serviceName}</span>
                <span className="font-medium text-ink-800 tabular-nums">{money(s.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between gap-6 border-t border-dashed border-slate-200 pt-3">
            <span className="text-sm font-semibold text-ink-900">Total</span>
            <span className="font-display text-lg font-bold text-brand-700 tabular-nums">{money(order.totalPrice)}</span>
          </div>
          {order.note && (
            <p className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-slate-400" /> {order.note}
            </p>
          )}
        </div>

        <div className="md:w-64">
          {hasContact ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-emerald-50 p-4 text-sm ring-1 ring-emerald-100">
              <p className="font-semibold text-emerald-800">{viewer === "user" ? `Mechanic: ${other.username}` : "Customer contact"}</p>
              <a href={`tel:${other.phone}`} className="mt-2 flex items-center gap-2 font-semibold text-emerald-700 hover:underline">
                <Phone className="size-4" /> {other.phone}
              </a>
              {other.email && (
                <a href={`mailto:${other.email}`} className="mt-1 flex items-center gap-2 text-emerald-700 hover:underline">
                  <Mail className="size-4" /> {other.email}
                </a>
              )}
            </motion.div>
          ) : (
            order.status === "pending" && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                {viewer === "user" ? "Contact details appear here once the mechanic accepts." : "Accept the order to see the customer's phone number."}
              </p>
            )
          )}
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      {/* before accepting: distance + approximate area, so the mechanic can decide early */}
      {viewer === "mechanic" && order.status === "pending" && (
        <div className="border-t border-slate-100 p-5 pt-4">
          <p className="mb-2.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
            <MapPin className="size-4 text-brand-600" /> Where is the customer?
            {order.customerDistanceKm != null && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700" data-testid="customer-distance">
                ≈ {km(order.customerDistanceKm)} away
              </span>
            )}
          </p>
          {showArea ? (
            CustomerLocationMap ? (
              <CustomerLocationMap location={order.approxLocation} shop={shop} approx distance={order.customerDistanceKm} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            )
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">The customer didn't share their location – call them after accepting to agree where to meet.</p>
          )}
        </div>
      )}

      {/* live customer location */}
      {viewer === "mechanic" && order.status === "accepted" && order.shareLocation && (
        <div className="border-t border-slate-100 p-5 pt-4">
          <p className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <MapPin className="size-4 text-emerald-600" /> Customer's live location
          </p>
          {order.customerLocation ? (
            CustomerLocationMap ? (
              <CustomerLocationMap location={order.customerLocation} shop={shop} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            )
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">Waiting for the customer's device to send its location…</p>
          )}
        </div>
      )}
      {viewer === "user" && order.shareLocation && (order.status === "pending" || order.status === "accepted") && (
        <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <MapPin className="size-3.5 text-emerald-600" />
          {order.status === "accepted" ? "Your live location is shared with the mechanic while this site is open." : "Your location will be shared once the mechanic accepts."}
        </p>
      )}
    </motion.article>
  );
}
