import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin, Plus, Trash2 } from "lucide-react";
import { api, CLIENT_URL, errorMessage } from "../lib/api";
import { useList } from "../lib/useList";
import { date } from "../lib/format";
import { DataTable, Drawer, PageHeader, useConfirm } from "../components/admin-ui";
import ServiceEditor from "../components/ServiceEditor";
import { CarTypeChooser, VehicleTypeBadges } from "../components/VehiclePicker";
import { VEHICLE_TYPES } from "../data/vehicles";
import { DEFAULT_TRAVEL_PRICING } from "../lib/pricing";
import { Avatar, Button, Field } from "../components/ui";

const blank = {
  username: "",
  email: "",
  phone: "",
  nid: "",
  password: "",
  shopname: "",
  address: "",
  latitude: 23.7808875,
  longitude: 90.2792371,
  vehicleTypes: [...VEHICLE_TYPES],
  travelPricing: { ...DEFAULT_TRAVEL_PRICING },
  services: [],
};
const numericPricing = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Number(v) || 0]));

export default function Mechanics() {
  const { rows, upsert, remove } = useList("/admin/mechanics");
  const { rows: orders } = useList("/admin/orders");
  const [editing, setEditing] = useState(null); // form object; has _id when editing
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const orderCount = useMemo(() => {
    const m = {};
    orders?.forEach((o) => o.mechanic?._id && (m[o.mechanic._id] = (m[o.mechanic._id] ?? 0) + 1));
    return m;
  }, [orders]);

  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { _id, password, ...rest } = editing;
    const body = {
      ...rest,
      latitude: Number(rest.latitude),
      longitude: Number(rest.longitude),
      services: rest.services.map(({ _id: sid, serviceName, price }) => ({ _id: sid, serviceName, price })),
      travelPricing: numericPricing({ ...DEFAULT_TRAVEL_PRICING, ...(rest.travelPricing || {}) }),
      ...(password ? { password } : {}),
    };
    try {
      const { data } = _id ? await api.put(`/admin/mechanics/${_id}`, body) : await api.post("/admin/mechanics", body);
      upsert(data);
      setEditing(null);
      toast.success(_id ? "Mechanic updated" : "Mechanic created");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (m) => {
    const n = orderCount[m._id] ?? 0;
    if (!(await confirm({ title: `Delete ${m.shopname}?`, message: `The mechanic account and ${n} order${n === 1 ? "" : "s"} will be removed permanently.` }))) return;
    try {
      await api.delete(`/admin/mechanics/${m._id}`);
      remove(m._id);
      setEditing(null);
      toast.success("Mechanic deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns = [
    {
      key: "shopname",
      header: "Garage",
      render: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={m.shopname} className="size-9 text-xs" />
          <div className="min-w-0">
            <p className="max-w-[16rem] truncate font-semibold text-ink-900">{m.shopname}</p>
            <p className="max-w-[16rem] truncate text-xs text-slate-500">{m.address || "No address"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "username",
      header: "Owner",
      render: (m) => (
        <div className="min-w-0">
          <p className="max-w-[12rem] truncate font-medium">{m.username}</p>
          <p className="text-xs text-slate-500">{m.phone}</p>
        </div>
      ),
    },
    { key: "vehicleTypes", header: "Car types", sortable: false, render: (m) => <VehicleTypeBadges types={m.vehicleTypes} max={2} size="xs" expandable={false} /> },
    { key: "services", header: "Services", sortValue: (m) => m.services.length, cellClassName: "tabular-nums", render: (m) => m.services.length },
    { key: "orders", header: "Orders", sortValue: (m) => orderCount[m._id] ?? 0, cellClassName: "tabular-nums", render: (m) => orderCount[m._id] ?? 0 },
    { key: "createdAt", header: "Joined", sortValue: (m) => new Date(m.createdAt).getTime(), render: (m) => <span className="text-xs whitespace-nowrap text-slate-500">{date(m.createdAt)}</span> },
  ];

  const isNew = editing && !editing._id;
  return (
    <>
      <PageHeader
        title="Mechanics"
        subtitle="Garages on the map. Click a row to edit."
        actions={
          <Button onClick={() => setEditing({ ...blank })}>
            <Plus className="size-4" /> Add mechanic
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        search={(m) => [m.shopname, m.username, m.email, m.phone, m.address, m.nid, ...(m.services ?? []).map((s) => s.serviceName)].join(" ")}
        onRowClick={(m) => setEditing({ ...m, password: "", address: m.address ?? "" })}
        emptyText="No mechanics registered yet."
        initialSort={{ key: "createdAt", dir: "desc" }}
      />

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Add mechanic" : editing?.shopname}
        subtitle={isNew ? "Create a garage account" : editing && `Joined ${date(editing.createdAt)}`}
        width="max-w-2xl"
        footer={
          editing && (
            <>
              {!isNew && (
                <Button variant="danger" className="mr-auto" onClick={() => del(editing)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              )}
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" form="mechanic-form" loading={busy} disabled={editing.vehicleTypes.length === 0}>
                {isNew ? "Create mechanic" : "Save changes"}
              </Button>
            </>
          )
        }
      >
        {editing && (
          <form id="mechanic-form" onSubmit={save} className="space-y-8">
            {!isNew && (
              <div className="flex flex-wrap gap-2">
                <Button href={`${CLIENT_URL}/store/${editing._id}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
                  <ExternalLink className="size-4" /> Open store page
                </Button>
                <Button href={`https://www.openstreetmap.org/?mlat=${editing.latitude}&mlon=${editing.longitude}#map=17/${editing.latitude}/${editing.longitude}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
                  <MapPin className="size-4" /> View location
                </Button>
              </div>
            )}
            <section className="grid gap-4 sm:grid-cols-2">
              <h3 className="text-sm font-bold sm:col-span-2">Account</h3>
              <Field label="Owner name" value={editing.username} onChange={set("username")} required />
              <Field label="Phone" value={editing.phone} onChange={set("phone")} required />
              <Field label="Email" type="email" value={editing.email} onChange={set("email")} required />
              <Field label="NID number" value={editing.nid} onChange={set("nid")} required inputMode="numeric" />
              <Field
                label={isNew ? "Password" : "New password"}
                type="password"
                autoComplete="new-password"
                value={editing.password}
                onChange={set("password")}
                required={isNew}
                minLength={8}
                hint={isNew ? "At least 8 characters, with a letter and a number" : "Leave empty to keep the current password"}
                className="sm:col-span-2"
              />
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <h3 className="text-sm font-bold sm:col-span-2">Shop</h3>
              <Field label="Shop name" value={editing.shopname} onChange={set("shopname")} required />
              <Field label="Address / area" value={editing.address} onChange={set("address")} />
              <Field label="Latitude" type="number" step="any" value={editing.latitude} onChange={set("latitude")} required />
              <Field label="Longitude" type="number" step="any" value={editing.longitude} onChange={set("longitude")} required />
            </section>
            <section>
              <h3 className="mb-3 text-sm font-bold">Car types serviced</h3>
              <div className="max-w-sm">
                <CarTypeChooser multiple ariaLabel="Car types serviced" placeholder="Select car types" value={editing.vehicleTypes} onChange={(vehicleTypes) => setEditing((f) => ({ ...f, vehicleTypes }))} />
              </div>
              {editing.vehicleTypes.length === 0 && <p className="mt-2 text-sm text-rose-600">Select at least one car type.</p>}
            </section>
            <section>
              <h3 className="mb-3 text-sm font-bold">Travel charge (home service)</h3>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["base", "Base ৳"],
                  ["perKm", "Per km ৳"],
                  ["freeWithinKm", "Free within km"],
                  ["maxDistanceKm", "Max km"],
                ].map(([k, label]) => (
                  <Field
                    key={k}
                    label={label}
                    type="number"
                    min="0"
                    step="any"
                    value={editing.travelPricing?.[k] ?? DEFAULT_TRAVEL_PRICING[k]}
                    onChange={(e) => setEditing((f) => ({ ...f, travelPricing: { ...DEFAULT_TRAVEL_PRICING, ...(f.travelPricing || {}), [k]: e.target.value } }))}
                  />
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-bold">Services & prices</h3>
              <ServiceEditor value={editing.services} onChange={(services) => setEditing((f) => ({ ...f, services }))} />
            </section>
          </form>
        )}
      </Drawer>
    </>
  );
}
