import axios from "axios";

export const TOKEN_KEY = "mm_admin_token"; // separate from the website's login
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");
export const CLIENT_URL = (import.meta.env.VITE_CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

export const api = axios.create({ baseURL: API_URL, timeout: 60_000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if ((status === 401 || status === 403) && localStorage.getItem(TOKEN_KEY) && !err.config.url.includes("/login")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK" || err?.code === "ECONNABORTED") {
    return "Can't reach the server right now. If it was sleeping it can take ~30s to wake up – please try again.";
  }
  return "Something went wrong. Please try again.";
}
