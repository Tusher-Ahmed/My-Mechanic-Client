import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api, API_URL, TOKEN_KEY } from "../lib/api";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);
const EVENT = "mm:notification";

/**
 * Loads the user's notifications and keeps a live Server-Sent Events connection open.
 * New notifications: added to the list, shown as a toast, and broadcast as a window event
 * so pages (dashboards, order lists) can refresh themselves.
 */
export function NotificationsProvider({ children }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [ring, setRing] = useState(0); // increments on every live notification (drives the bell shake)
  const [live, setLive] = useState(false);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const seen = useRef(null); // ids already known – so notifications fetched later (not live) still reach the pages

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items);
      setUnread(data.unread);
      // anything new that arrived while the live connection was down (free server asleep, tab in the
      // background, proxy cut the stream) is broadcast like a live one, so open pages update themselves
      const fresh = seen.current ? data.items.filter((n) => !seen.current.has(n._id)) : [];
      seen.current = new Set([...(seen.current ?? []), ...data.items.map((n) => n._id)]);
      for (const n of fresh.reverse()) window.dispatchEvent(new CustomEvent(EVENT, { detail: n }));
    } catch {
      /* offline or logged out – ignore */
    }
  }, []);

  useEffect(() => {
    if (!role) {
      setItems([]);
      setUnread(0);
      seen.current = null;
      return;
    }
    refresh();

    let source;
    let retryTimer;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || stopped) return;
      source = new EventSource(`${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`);

      source.addEventListener("ready", () => {
        setLive(true);
        if (attempt > 0) refresh(); // catch up on anything missed while disconnected
        attempt = 0;
      });

      // customer live location (mechanics only) – pages update their own state
      source.addEventListener("order:location", (e) => {
        window.dispatchEvent(new CustomEvent("mm:order-location", { detail: JSON.parse(e.data) }));
      });

      source.addEventListener("notification", (e) => {
        const n = JSON.parse(e.data);
        seen.current?.add(n._id);
        setItems((list) => [n, ...list.filter((x) => x._id !== n._id)].slice(0, 30));
        setUnread((u) => u + 1);
        setRing((r) => r + 1);
        window.dispatchEvent(new CustomEvent(EVENT, { detail: n }));
        toast(n.title, {
          description: n.body,
          action: n.link ? { label: "View", onClick: () => navigateRef.current(n.link) } : undefined,
        });
      });

      source.onerror = () => {
        setLive(false);
        // browser retries by itself while the connection is "connecting"; if it gave up, retry with backoff
        if (source.readyState === EventSource.CLOSED && !stopped) {
          attempt += 1;
          retryTimer = setTimeout(connect, Math.min(60_000, 3_000 * 2 ** attempt));
        }
      };
    };
    connect();

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      source?.close();
      setLive(false);
      window.removeEventListener("focus", onFocus);
    };
  }, [role, refresh]);

  const markRead = useCallback(async (id) => {
    let changed = false;
    setItems((list) =>
      list.map((n) => {
        if (n._id === id && !n.read) changed = true;
        return n._id === id ? { ...n, read: true } : n;
      })
    );
    if (changed) setUnread((u) => Math.max(0, u - 1));
    await api.patch(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api.post("/notifications/read-all").catch(() => {});
  }, []);

  // delete one notification for good (removed from the database, not just hidden)
  const remove = useCallback(
    async (id) => {
      const target = items.find((n) => n._id === id);
      setItems((list) => list.filter((n) => n._id !== id));
      if (target && !target.read) setUnread((u) => Math.max(0, u - 1));
      try {
        const { data } = await api.delete(`/notifications/${id}`);
        setUnread(data.unread);
        return true;
      } catch {
        refresh(); // put it back if the server refused
        return false;
      }
    },
    [items, refresh]
  );

  const value = useMemo(() => ({ items, unread, ring, live, markRead, markAllRead, remove, refresh }), [items, unread, ring, live, markRead, markAllRead, remove, refresh]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);

/** Run `callback(notification)` whenever a live notification arrives. */
export function useNotificationEvents(callback) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const handler = (e) => ref.current(e.detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
}
