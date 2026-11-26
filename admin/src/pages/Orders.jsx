import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useList } from "../lib/useList";
import { date, money } from "../lib/format";
import { DataTable, Detail, Drawer, PageHeader, useConfirm } from "../components/admin-ui";
import { CarTypeIcon } from "../components/VehiclePicker";
import { Button, StatusBadge } from "../components/ui";
import { clockTime, orderNo } from "../lib/pricing";

const STATUSES = ["pending", "accepted", "completed", "cancelled"];
const carText = (v) => (v ? `${v.make} ${v.model}` : "—");

function Contact({ title, person }) {
  if (!person) return <p className="text-sm text-slate-400">{title}: account deleted</p>;
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      <p className="mt-1 font-semibold text-ink-900">{person.username}</p>
      {person.shopname && <p className="text-sm text-slate-500">{person.shopname}</p>}
      <div className="mt-2 space-y-1 text-sm">
        {person.phone && (
          <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
            <Phone className="size-3.5" /> {person.phone}
          </a>
        )}
        {person.email && (
          <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-brand-700 hover:underline">
            <Mail className="size-3.5" /> {person.email}
          </a>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const { rows, upsert, remove } = useList("/admin/orders");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const shown = rows?.filter((o) => filter === "all" || o.status === filter);
  const count = (s) => rows?.filter((o) => s === "all" || o.status === s).length ?? 0;

  const setStatus = async (order, status) => {
    if (status === order.status) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}/status`, { status });
      upsert(data);
      setOpen(data);
      toast.success(`Order marked as ${status} – customer and mechanic notified`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (order) => {
    if (!(await confirm({ title: "Delete this order?", message: `Order ${orderNo(order)} at ${order.shopname} will be removed permanently.` }))) return;
    try {
      await api.delete(`/admin/orders/${order._id}`);
      remove(order._id);
      setOpen(null);
      toast.success("Order deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns = [
    {
      key: "createdAt",
      header: "Order",
      sortValue: (o) => new Date(o.createdAt).getTime(),
      render: (o) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink-900">{orderNo(o)}</p>
          <p className="text-xs whitespace-nowrap text-slate-500">{date(o.createdAt)}</p>
        </div>
      ),
    },
    { key: "customer", header: "Customer", sortValue: (o) => o.user?.username, render: (o) => <span className="font-medium text-ink-900">{o.user?.username ?? "—"}</span> },
    { key: "shopname", header: "Garage", render: (o) => <span className="block max-w-[14rem] truncate">{o.shopname}</span> },
    {
      key: "vehicle",
      header: "Car",
      sortValue: (o) => carText(o.vehicle),
      render: (o) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CarTypeIcon type={o.vehicle?.type} className="h-4 w-9 shrink-0 text-slate-400" />
          {carText(o.vehicle)}
        </span>
      ),
    },
    { key: "totalPrice", header: "Total", cellClassName: "text-right tabular-nums font-semibold", className: "text-right", render: (o) => money(o.totalPrice) },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="Every booking on the platform. Click a row for details." />
      <DataTable
        columns={columns}
        rows={shown}
        search={(o) => [o._id, orderNo(o), o.shopname, o.user?.username, o.user?.email, carText(o.vehicle), o.vehicle?.plate, o.status].join(" ")}
        onRowClick={setOpen}
        emptyText={filter === "all" ? "No orders yet." : `No ${filter} orders.`}
        initialSort={{ key: "createdAt", dir: "desc" }}
        toolbar={["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === s ? "bg-ink-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
          >
            {s} <span className={filter === s ? "text-slate-300" : "text-slate-400"}>{count(s)}</span>
          </button>
        ))}
      />

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `Order ${orderNo(open)}` : ""}
        subtitle={open ? `${open.shopname} · ${date(open.createdAt)}` : ""}
        footer={
          open && (
            <Button variant="danger" onClick={() => del(open)}>
              <Trash2 className="size-4" /> Delete order
            </Button>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Status</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Order status">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={open.status === s}
                    disabled={busy}
                    onClick={() => setStatus(open, s)}
                    className={`rounded-xl px-3.5 py-2 text-sm font-semibold capitalize transition-colors ${open.status === s ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {open.vehicle && (
              <div className="flex items-center gap-4 rounded-2xl bg-ink-900 p-4 text-slate-300">
                <CarTypeIcon type={open.vehicle.type} className="h-8 w-20 shrink-0 text-brand-400" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {open.vehicle.make} {open.vehicle.model} {open.vehicle.year && <span className="font-normal text-slate-400">· {open.vehicle.year}</span>}
                  </p>
                  <p className="truncate text-sm">
                    {open.vehicle.type}
                    {open.vehicle.plate && <> · <span className="font-mono">{open.vehicle.plate}</span></>}
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Services</p>
              <div className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {open.services.map((s, i) => (
                  <div key={i} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <span>{s.serviceName}</span>
                    <span className="font-medium tabular-nums">{money(s.price)}</span>
                  </div>
                ))}
                {open.serviceMode === "home" && (
                  <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <span>Travel charge{open.travelDistanceKm != null && <span className="text-slate-400"> · {open.travelDistanceKm} km</span>}</span>
                    <span className="font-medium tabular-nums">{open.travelFee ? money(open.travelFee) : "Free"}</span>
                  </div>
                )}
                <div className="flex justify-between bg-slate-50 px-4 py-3 font-semibold">
                  <span>Total</span>
                  <span className="text-brand-700 tabular-nums">{money(open.totalPrice)}</span>
                </div>
              </div>
            </div>

            {open.status === "cancelled" && open.cancellation && (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-100" data-testid="admin-cancellation">
                <p className="font-semibold">
                  Cancelled by {open.cancellation.by === "user" ? "the customer" : open.cancellation.by === "mechanic" ? "the mechanic" : "an admin"} · {date(open.cancellation.at)}
                </p>
                {open.cancellation.reason && <p className="mt-1">{open.cancellation.reason}</p>}
                <p className="mt-1 text-xs text-rose-700/80">Not counted in any revenue.</p>
              </div>
            )}

            {open.note && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Customer note</p>
                <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{open.note}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Contact title="Customer" person={open.user} />
              <Contact title="Mechanic" person={open.mechanic} />
            </div>

            <div className="divide-y divide-slate-100">
              <Detail label="Service">{open.serviceMode === "home" ? "Mechanic travels to the customer" : "Customer brings the car to the garage"}</Detail>
              {open.eta?.arriveBy && <Detail label="Arrival promised">{clockTime(open.eta.arriveBy)} ({open.eta.minutes} min)</Detail>}
              <Detail label="Customer verified">{open.verifiedAt ? `Yes, at ${clockTime(open.verifiedAt)}` : "Not yet"}</Detail>
              <Detail label="Live location">{open.shareLocation ? "Shared with the mechanic (hidden from admins)" : "Not shared"}</Detail>
              <Detail label="Placed">{date(open.createdAt)}</Detail>
              <Detail label="Last update">{date(open.updatedAt)}</Detail>
              <Detail label="Order ID">
                <span className="font-mono text-xs">{open._id}</span>
              </Detail>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
