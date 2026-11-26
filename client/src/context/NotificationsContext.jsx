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

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline or logged out – ignore */
    }
  }, []);

  useEffect(() => {
    if (!role) {
      setItems([]);
      setUnread(0);
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

  const value = useMemo(() => ({ items, unread, ring, live, markRead, markAllRead, refresh }), [items, unread, ring, live, markRead, markAllRead, refresh]);
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
