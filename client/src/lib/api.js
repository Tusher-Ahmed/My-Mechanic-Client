import axios from "axios";

export const TOKEN_KEY = "mm_token";
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

export const api = axios.create({ baseURL: API_URL, timeout: 60_000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !err.config.url.includes("/login")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(err);
  }
);

/** Human-friendly message from an API / network error. */
export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK" || err?.code === "ECONNABORTED") {
    return "Can't reach the server right now. The free server sleeps when unused and can take up to a minute to wake up – please try again.";
  }
  return "Something went wrong. Please try again.";
}

// The free API host sleeps after 15 idle minutes; nudge it awake as soon as the app opens,
// so it's ready by the time the visitor clicks something.
api.get("/health", { timeout: 90_000 }).catch(() => {});
