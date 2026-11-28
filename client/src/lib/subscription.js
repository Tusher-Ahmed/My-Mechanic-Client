import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { useNotificationEvents } from "../context/NotificationsContext";

/** The logged-in mechanic's subscription: status, personal prices and payment history. */
export function useSubscription() {
  const [sub, setSub] = useState(null);
  const reload = useCallback(
    () =>
      api
        .get("/subscriptions/me")
        .then(({ data }) => setSub(data))
        .catch(() => {}),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  // payments, reminders and the admin's approval (which starts the free trial) all arrive as notifications
  useNotificationEvents(() => reload());
  return { sub, reload };
}

/** Start a checkout for a plan and go to the payment page. */
export async function startCheckout(plan, navigate) {
  try {
    const { data } = await api.post("/subscriptions/checkout", { plan });
    navigate(data.checkoutUrl);
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

export const planDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
