import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Inbox, Reply, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useList } from "../lib/useList";
import { date, timeAgo } from "../lib/format";
import { PageHeader, useConfirm } from "../components/admin-ui";
import { GearLoader } from "../components/mech";
import { Avatar, Button, EmptyState } from "../components/ui";
import { dur, ease } from "../lib/motion";

export default function Messages() {
  const { rows, remove } = useList("/admin/messages");
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState("");
  const confirm = useConfirm();

  const q = query.trim().toLowerCase();
  const shown = rows?.filter((m) => !q || `${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q));

  const del = async (m) => {
    if (!(await confirm({ title: "Delete this message?", message: `"${m.subject}" from ${m.email}` }))) return;
    try {
      await api.delete(`/admin/messages/${m._id}`);
      remove(m._id);
      toast.success("Message deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Messages" subtitle="From the website's contact form." />

      {!rows ? (
        <div className="grid h-60 place-items-center">
          <GearLoader label="Loading messages" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title="Inbox zero">
          New contact-form messages will appear here.
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <label className="relative block sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search messages…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search messages" />
            </label>
          </div>
          <ul className="divide-y divide-slate-100">
            <AnimatePresence initial={false}>
              {shown.map((m) => {
                const open = openId === m._id;
                return (
                  <motion.li key={m._id} layout exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}>
                    <button onClick={() => setOpenId(open ? null : m._id)} aria-expanded={open} className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors ${open ? "bg-brand-50/40" : "hover:bg-slate-50"}`}>
                      <Avatar name={m.email} className="size-10 text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="truncate font-semibold text-ink-900">{m.subject}</p>
                          <span className="shrink-0 text-xs text-slate-400" title={date(m.createdAt)}>
                            {timeAgo(m.createdAt)}
                          </span>
                        </div>
                        <p className="truncate text-sm text-slate-500">{m.email}</p>
                        {!open && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{m.message}</p>}
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1, transition: { duration: dur.standard, ease } }}
                          exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 sm:pl-[4.75rem]">
                            <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 ring-1 ring-slate-200">{m.message}</p>
                            <div className="mt-3 flex gap-2">
                              <Button href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} size="sm">
                                <Reply className="size-4" /> Reply by email
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => del(m)}>
                                <Trash2 className="size-4" /> Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {shown.length === 0 && <li className="px-5 py-12 text-center text-sm text-slate-500">No messages match "{query}".</li>}
          </ul>
        </div>
      )}
    </>
  );
}
