// Mechanic dashboard: shows while the garage waits for an admin, or after a rejection.
import { motion } from "motion/react";
import { FileWarning, Hourglass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";

export const isApproved = (account) => !account?.approvalStatus || account.approvalStatus === "approved";

// (the dashboard reloads the account when the admin's decision arrives as a live notification)
export default function ApprovalBanner({ onFix }) {
  const { account } = useAuth();
  const status = account?.approvalStatus;

  if (isApproved(account)) return null;
  const rejected = status === "rejected";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      data-testid="approval-banner"
      className={`mb-8 flex flex-col gap-4 rounded-2xl p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between ${rejected ? "bg-rose-600 text-white shadow-rose-900/20" : "bg-amber-50 text-amber-950 shadow-amber-900/5 ring-1 ring-amber-200"}`}
    >
      <div className="flex items-start gap-3">
        {rejected ? <FileWarning className="mt-0.5 size-6 shrink-0" /> : <Hourglass className="mt-0.5 size-6 shrink-0 text-amber-600" />}
        <div>
          <p className="font-bold">{rejected ? "Your garage wasn't approved" : "Waiting for approval"}</p>
          <p className={`text-sm ${rejected ? "text-rose-100" : "text-amber-800"}`}>
            {rejected ? (
              <>
                {account.approval?.reason && <>Reason: {account.approval.reason}. </>}Fix your trade licence number in “My shop” to apply again.
              </>
            ) : (
              <>
                We're checking your trade licence <b className="font-mono">{account.tradeLicense}</b> – usually within a day. You'll get a notification; then choose a plan to
                appear on the map.
              </>
            )}
          </p>
        </div>
      </div>
      {rejected && (
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onFix}>
          Update trade licence
        </Button>
      )}
    </motion.div>
  );
}
