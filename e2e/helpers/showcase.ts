import type { APIRequestContext } from "@playwright/test";
import { API_URL, TEST_ADMIN } from "../playwright.config";

let adminToken: string | null = null;

/**
 * Seed helper for walk-throughs: an admin approves a self-registered garage and the
 * "approved" notification is removed, so the walk-through starts from a clean bell.
 */
export async function approveQuietly(request: APIRequestContext, mechanicId: string, mechanicToken: string) {
  adminToken ??= (await (await request.post(`${API_URL}/auth/admin/login`, { data: TEST_ADMIN })).json()).token;
  const res = await request.put(`${API_URL}/admin/mechanics/${mechanicId}/approval`, {
    data: { status: "approved" },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok()) throw new Error(`approve: ${res.status()} ${await res.text()}`);
  const h = { headers: { Authorization: `Bearer ${mechanicToken}` } };
  const { items } = await (await request.get(`${API_URL}/notifications`, h)).json();
  for (const n of items) await request.delete(`${API_URL}/notifications/${n._id}`, h);
}
