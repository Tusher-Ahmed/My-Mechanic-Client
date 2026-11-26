import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useList } from "../lib/useList";
import { date, money } from "../lib/format";
import { DataTable, Drawer, PageHeader, useConfirm } from "../components/admin-ui";
import { CarTypeIcon } from "../components/VehiclePicker";
import { Avatar, Button, Field } from "../components/ui";

const blank = { username: "", email: "", phone: "", password: "", vehicles: [] };

export default function Users() {
  const { rows, upsert, remove } = useList("/admin/users");
  const { rows: orders } = useList("/admin/orders");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const stats = useMemo(() => {
    const m = {};
    orders?.forEach((o) => {
      const id = o.user?._id;
      if (!id) return;
      m[id] ??= { count: 0, spent: 0 };
      m[id].count += 1;
      if (o.status === "accepted" || o.status === "completed") m[id].spent += o.totalPrice;
    });
    return m;
  }, [orders]);

  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { _id, password, username, email, phone, vehicles } = editing;
    const body = { username, email, phone, vehicles, ...(password ? { password } : {}) };
    try {
      const { data } = _id ? await api.put(`/admin/users/${_id}`, body) : await api.post("/admin/users", body);
      upsert(data);
      setEditing(null);
      toast.success(_id ? "Customer updated" : "Customer created");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (u) => {
    const n = stats[u._id]?.count ?? 0;
    if (!(await confirm({ title: `Delete ${u.username}?`, message: `The customer account and ${n} order${n === 1 ? "" : "s"} will be removed permanently.` }))) return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      remove(u._id);
      setEditing(null);
      toast.success("Customer deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns = [
    {
      key: "username",
      header: "Customer",
      render: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.username} className="size-9 text-xs" />
          <div className="min-w-0">
            <p className="max-w-[14rem] truncate font-semibold text-ink-900">{u.username}</p>
            <p className="max-w-[14rem] truncate text-xs text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (u) => <span className="whitespace-nowrap">{u.phone}</span> },
    {
      key: "vehicles",
      header: "Cars",
      sortValue: (u) => u.vehicles?.length ?? 0,
      render: (u) =>
        u.vehicles?.length ? (
          <span className="flex items-center gap-2 whitespace-nowrap" title={u.vehicles.map((v) => `${v.make} ${v.model}`).join(", ")}>
            <CarTypeIcon type={u.vehicles[0].type} className="h-4 w-9 text-slate-400" />
            {u.vehicles[0].make} {u.vehicles[0].model}
            {u.vehicles.length > 1 && <span className="text-xs text-slate-400">+{u.vehicles.length - 1}</span>}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    { key: "orders", header: "Orders", sortValue: (u) => stats[u._id]?.count ?? 0, cellClassName: "tabular-nums", render: (u) => stats[u._id]?.count ?? 0 },
    { key: "spent", header: "Spent", sortValue: (u) => stats[u._id]?.spent ?? 0, cellClassName: "tabular-nums", render: (u) => money(stats[u._id]?.spent ?? 0) },
    { key: "createdAt", header: "Joined", sortValue: (u) => new Date(u.createdAt).getTime(), render: (u) => <span className="text-xs whitespace-nowrap text-slate-500">{date(u.createdAt)}</span> },
  ];

  const isNew = editing && !editing._id;
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Car owners who book mechanics. Click a row to edit."
        actions={
          <Button onClick={() => setEditing({ ...blank })}>
            <Plus className="size-4" /> Add customer
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        search={(u) => [u.username, u.email, u.phone, ...(u.vehicles ?? []).map((v) => `${v.make} ${v.model} ${v.plate ?? ""}`)].join(" ")}
        onRowClick={(u) => setEditing({ ...u, password: "", vehicles: u.vehicles ?? [] })}
        emptyText="No customers yet."
        initialSort={{ key: "createdAt", dir: "desc" }}
      />

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Add customer" : editing?.username}
        subtitle={isNew ? "Create a customer account" : editing && `Joined ${date(editing.createdAt)}`}
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
              <Button type="submit" form="user-form" loading={busy}>
                {isNew ? "Create customer" : "Save changes"}
              </Button>
            </>
          )
        }
      >
        {editing && (
          <form id="user-form" onSubmit={save} className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={editing.username} onChange={set("username")} required className="sm:col-span-2" />
              <Field label="Email" type="email" value={editing.email} onChange={set("email")} required />
              <Field label="Phone" value={editing.phone} onChange={set("phone")} required />
              <Field
                label={isNew ? "Password" : "New password"}
                type="password"
                autoComplete="new-password"
                value={editing.password}
                onChange={set("password")}
                required={isNew}
                minLength={6}
                hint={isNew ? "At least 6 characters" : "Leave empty to keep the current password"}
                className="sm:col-span-2"
              />
            </section>
            {!isNew && (
              <section>
                <h3 className="mb-3 text-sm font-bold">Saved cars</h3>
                {editing.vehicles.length === 0 ? (
                  <p className="text-sm text-slate-500">No saved cars.</p>
                ) : (
                  <ul className="space-y-2">
                    {editing.vehicles.map((v, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
                        <CarTypeIcon type={v.type} className="h-5 w-11 shrink-0 text-brand-600" />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="truncate font-semibold">
                            {v.make} {v.model}
                          </p>
                          <p className="truncate text-xs text-slate-500">{[v.type, v.year, v.plate].filter(Boolean).join(" · ")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing((f) => ({ ...f, vehicles: f.vehicles.filter((_, idx) => idx !== i) }))}
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${v.make} ${v.model}`}
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </form>
        )}
      </Drawer>
    </>
  );
}
