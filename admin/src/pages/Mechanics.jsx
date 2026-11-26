import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Hourglass, MapPin, Plus, ShieldCheck, Trash2, XCircle } from "lucide-react";
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
  tradeLicense: "",
  address: "",
  latitude: 23.7808875,
  longitude: 90.2792371,
  vehicleTypes: [...VEHICLE_TYPES],
  inspectionFee: "",
  travelPricing: { ...DEFAULT_TRAVEL_PRICING },
  services: [],
};
const numericPricing = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Number(v) || 0]));

export default function Mechanics() {
  const { rows, upsert, remove } = useList("/admin/mechanics");
  const { rows: orders } = useList("/admin/orders");
  const [editing, setEditing] = useState(null); // form object; has _id when editing
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const [pendingOnly, setPendingOnly] = useState(() => params.get("pending") === "1");
  const [rejectReason, setRejectReason] = useState("");
  const confirm = useConfirm();
  const pendingCount = rows?.filter((m) => m.approvalStatus === "pending").length ?? 0;
  // memoised: the table resets its paging when it gets a new rows array, so a fresh array each render would loop
  const shownRows = useMemo(() => (pendingOnly ? rows?.filter((m) => m.approvalStatus === "pending") : rows), [rows, pendingOnly]);

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
      tradeLicense: rest.tradeLicense?.trim() || undefined,
      inspectionFee: rest.inspectionFee === "" || rest.inspectionFee == null ? undefined : Number(rest.inspectionFee),
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
      key: "approvalStatus",
      header: "Status",
      sortValue: (m) => ({ pending: 0, rejected: 1 })[m.approvalStatus] ?? 2,
      render: (m) => <ApprovalChip status={m.approvalStatus} />,
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
    {
      key: "subscriptionEndsAt",
      header: "Plan",
      sortValue: (m) => (m.subscriptionEndsAt ? new Date(m.subscriptionEndsAt).getTime() : 0),
      render: (m) =>
        m.subscriptionEndsAt && new Date(m.subscriptionEndsAt) > new Date() ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700">until {new Date(m.subscriptionEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        ) : (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-rose-700">{m.subscriptionEndsAt ? "expired" : "no plan"}</span>
        ),
    },
    { key: "createdAt", header: "Joined", sortValue: (m) => new Date(m.createdAt).getTime(), render: (m) => <span className="text-xs whitespace-nowrap text-slate-500">{date(m.createdAt)}</span> },
  ];

  const isNew = editing && !editing._id;
  const active = editing?.subscriptionEndsAt && new Date(editing.subscriptionEndsAt) > new Date();

  // admin plan controls: extend by 30 days from the later of today / current end, or end the plan now
  const setPlanEnd = async (endsAt) => {
    try {
      const { data } = await api.put(`/admin/mechanics/${editing._id}/subscription`, { endsAt, plan: editing.subscriptionPlan ?? "monthly" });
      upsert(data);
      setEditing((f) => ({ ...f, subscriptionEndsAt: data.subscriptionEndsAt, subscriptionPlan: data.subscriptionPlan }));
      toast.success(endsAt ? "Plan extended" : "Plan ended – garage hidden from the map");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const decide = async (status) => {
    if (status === "rejected" && rejectReason.trim().length < 3) return toast.error("Write why the garage isn't approved – the mechanic sees it.");
    try {
      const { data } = await api.put(`/admin/mechanics/${editing._id}/approval`, { status, ...(status === "rejected" ? { reason: rejectReason.trim() } : {}) });
      upsert(data);
      setEditing((f) => ({ ...f, approvalStatus: data.approvalStatus, approval: data.approval }));
      setRejectReason("");
      toast.success(status === "approved" ? "Garage approved – the mechanic has been notified" : "Garage rejected – the mechanic has been told why");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const extend30 = () => {
    const base = active ? new Date(editing.subscriptionEndsAt) : new Date();
    setPlanEnd(new Date(base.getTime() + 30 * 86_400_000).toISOString());
  };
  return (
    <>
      <PageHeader
        title="Mechanics"
        subtitle="Garages on the map. Click a row to edit."
        actions={
          <>
          <Button variant={pendingOnly ? "primary" : "secondary"} onClick={() => setPendingOnly((v) => !v)} aria-pressed={pendingOnly} data-testid="pending-filter">
            <Hourglass className="size-4" /> Pending approval
            {pendingCount > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-ink-900">{pendingCount}</span>}
          </Button>
          <Button onClick={() => setEditing({ ...blank })}>
            <Plus className="size-4" /> Add mechanic
          </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={shownRows}
        search={(m) => [m.shopname, m.username, m.email, m.phone, m.address, m.nid, m.tradeLicense, ...(m.services ?? []).map((s) => s.serviceName)].join(" ")}
        onRowClick={(m) => {
          setRejectReason("");
          setEditing({ ...m, password: "", address: m.address ?? "", tradeLicense: m.tradeLicense ?? "" });
        }}
        emptyText={pendingOnly ? "No garages waiting for approval." : "No mechanics registered yet."}
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
            {!isNew && editing.approvalStatus && editing.approvalStatus !== "approved" && (
              <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200" data-testid="admin-approval">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
                  <ShieldCheck className="size-4" /> {editing.approvalStatus === "rejected" ? "Rejected" : "Waiting for approval"}
                </p>
                <p className="mt-1 text-sm text-amber-900">
                  Trade licence: <b className="font-mono">{editing.tradeLicense || "—"}</b> · NID {editing.nid}. Check them before approving.
                </p>
                {editing.approvalStatus === "rejected" && editing.approval?.reason && <p className="mt-1 text-xs text-amber-800">Last reason: {editing.approval.reason}</p>}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="Reason (needed to reject)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={300} placeholder="e.g. Licence number doesn't match the shop" className="flex-1" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="danger" onClick={() => decide("rejected")}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                    <Button type="button" size="sm" variant="success" onClick={() => decide("approved")}>
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                  </div>
                </div>
              </section>
            )}
            {!isNew && (
              <section className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1 ${active ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100"}`} data-testid="admin-plan">
                <p className="text-sm">
                  <b>{active ? "On the map" : "Hidden from the map"}</b> ·{" "}
                  {editing.subscriptionEndsAt ? `plan ${active ? "until" : "ended"} ${new Date(editing.subscriptionEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "never subscribed"}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={extend30}>+30 days</Button>
                  {active && <Button type="button" size="sm" variant="danger" onClick={() => setPlanEnd(null)}>End plan</Button>}
                </div>
              </section>
            )}
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
              <Field label="Trade licence number" value={editing.tradeLicense} onChange={set("tradeLicense")} required={isNew} placeholder="e.g. TRAD/DNCC/012345/2026" hint={isNew ? "Garages you add are approved at once" : undefined} />
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
              <h3 className="mb-3 text-sm font-bold">Inspection fee</h3>
              <Field
                label="Inspection fee ৳ (required)"
                type="number"
                min="0"
                step="10"
                required
                value={editing.inspectionFee ?? ""}
                onChange={set("inspectionFee")}
                hint="Charged when a customer doesn't know the problem"
                className="max-w-xs"
              />
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

function ApprovalChip({ status }) {
  if (status === "pending") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800">pending</span>;
  if (status === "rejected") return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-rose-700">rejected</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-emerald-700">approved</span>;
}
