import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useList } from "../lib/useList";
import { date } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { DataTable, Drawer, PageHeader, useConfirm } from "../components/admin-ui";
import { Avatar, Button, Field } from "../components/ui";

const blank = { username: "", email: "", password: "" };

export default function Admins() {
  const { admin: me } = useAuth();
  const { rows, upsert, remove } = useList("/admin/admins");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/admin/admins", form);
      upsert(data);
      setForm(null);
      toast.success("Admin created");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const del = async (a) => {
    if (!(await confirm({ title: `Remove ${a.username}?`, message: "They will lose access to the admin panel immediately." }))) return;
    try {
      await api.delete(`/admin/admins/${a._id}`);
      remove(a._id);
      toast.success("Admin removed");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const columns = [
    {
      key: "username",
      header: "Admin",
      render: (a) => (
        <div className="flex items-center gap-3">
          <Avatar name={a.username} className="size-9 text-xs" />
          <div>
            <p className="font-semibold text-ink-900">
              {a.username} {a._id === me._id && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">You</span>}
            </p>
            <p className="text-xs text-slate-500">{a.email}</p>
          </div>
        </div>
      ),
    },
    { key: "createdAt", header: "Added", sortValue: (a) => new Date(a.createdAt).getTime(), render: (a) => <span className="text-xs text-slate-500">{date(a.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      sortable: false,
      className: "text-right",
      cellClassName: "text-right",
      render: (a) =>
        a._id !== me._id && (
          <Button variant="danger" size="sm" onClick={() => del(a)} aria-label={`Remove ${a.username}`}>
            <Trash2 className="size-4" />
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="People who can access this panel."
        actions={
          <Button onClick={() => setForm({ ...blank })}>
            <Plus className="size-4" /> Add admin
          </Button>
        }
      />
      <DataTable columns={columns} rows={rows} search={(a) => `${a.username} ${a.email}`} emptyText="No admins." />

      <Drawer
        open={!!form}
        onClose={() => setForm(null)}
        title="Add admin"
        subtitle="Full access to customers, mechanics, orders and messages"
        width="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-form" loading={busy}>
              <ShieldCheck className="size-4" /> Create admin
            </Button>
          </>
        }
      >
        {form && (
          <form id="admin-form" onSubmit={save} className="space-y-4">
            <Field label="Name" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Field
              label="Password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              hint="At least 8 characters, with a letter and a number"
            />
          </form>
        )}
      </Drawer>
    </>
  );
}
