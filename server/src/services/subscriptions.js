// Subscription plans, prices and activation.
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { Setting } from "../models/Setting.js";
import { Subscription } from "../models/Subscription.js";
import { Mechanic } from "../models/Mechanic.js";
import { notify } from "./notifications.js";

export const DEFAULT_PLANS = {
  plans: {
    monthly: { label: "Monthly", days: 30, price: 299, introPrice: 99 },
    yearly: { label: "Yearly", days: 365, price: 2499, introPrice: 1499 },
  },
  renewalDiscountPercent: 20,
};

export async function getPlanSettings() {
  const doc = await Setting.findById("plans").lean();
  const v = doc?.value ?? {};
  return {
    plans: {
      monthly: { ...DEFAULT_PLANS.plans.monthly, ...(v.plans?.monthly ?? {}) },
      yearly: { ...DEFAULT_PLANS.plans.yearly, ...(v.plans?.yearly ?? {}) },
    },
    renewalDiscountPercent: v.renewalDiscountPercent ?? DEFAULT_PLANS.renewalDiscountPercent,
  };
}

export async function savePlanSettings(value) {
  await Setting.findByIdAndUpdate("plans", { value }, { upsert: true });
  return getPlanSettings();
}

/** Garages with an active plan (trusted operator – sanitizeFilter would strip $gt otherwise). */
export const activeFilter = () => ({ subscriptionEndsAt: mongoose.trusted({ $gt: new Date() }) });
export const isActive = (mechanic) => !!mechanic?.subscriptionEndsAt && mechanic.subscriptionEndsAt > new Date();

/** Price this mechanic pays for a plan: starter price first time, loyalty discount afterwards. */
export async function quote(mechanicId, planKey) {
  const settings = await getPlanSettings();
  const plan = settings.plans[planKey];
  const returning = await Subscription.exists({ mechanic: mechanicId, status: "paid" });
  if (!returning) return { plan: planKey, kind: "intro", listPrice: plan.price, amount: plan.introPrice, days: plan.days, label: plan.label };
  const amount = Math.round((plan.price * (100 - settings.renewalDiscountPercent)) / 100);
  return { plan: planKey, kind: "renewal", listPrice: plan.price, amount, days: plan.days, label: plan.label, discountPercent: settings.renewalDiscountPercent };
}

export async function quotes(mechanicId) {
  return { monthly: await quote(mechanicId, "monthly"), yearly: await quote(mechanicId, "yearly") };
}

export const newTranId = () => `MMS-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;

export async function createPending(mechanicId, planKey, gateway) {
  const q = await quote(mechanicId, planKey);
  return Subscription.create({ mechanic: mechanicId, plan: planKey, kind: q.kind, listPrice: q.listPrice, amount: q.amount, days: q.days, gateway, tranId: newTranId() });
}

/**
 * Mark a pending subscription as paid and extend the garage's plan.
 * Idempotent: a second call (e.g. SSLCommerz IPN after the browser redirect) does nothing.
 * The plan stacks: it starts when the current one ends, so renewing early never loses days.
 */
export async function activate(sub, extra = {}) {
  const fresh = await Subscription.findOneAndUpdate({ _id: sub._id, status: "pending" }, { status: "paid", paidAt: new Date(), ...extra }, { new: true });
  if (!fresh) return Subscription.findById(sub._id); // already handled

  const mechanic = await Mechanic.findById(fresh.mechanic);
  const now = new Date();
  const start = mechanic.subscriptionEndsAt && mechanic.subscriptionEndsAt > now ? mechanic.subscriptionEndsAt : now;
  const end = new Date(start.getTime() + fresh.days * 86_400_000);
  fresh.startsAt = start;
  fresh.endsAt = end;
  await fresh.save();

  mechanic.subscriptionPlan = fresh.plan;
  mechanic.subscriptionEndsAt = end;
  mechanic.subscriptionReminders = {}; // reminders start over for the new period
  await mechanic.save();

  await notify({
    recipient: mechanic._id,
    role: "mechanic",
    type: "subscription",
    title: `Payment received – your ${fresh.plan} plan is active`,
    body: `৳${fresh.amount.toLocaleString("en-US")} · your garage is on the map until ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
    link: "/mechanic?tab=subscription",
  });
  return fresh;
}

export async function markFailed(sub, status = "failed") {
  return Subscription.findOneAndUpdate({ _id: sub._id, status: "pending" }, { status }, { new: true });
}

/**
 * Reminders: 7 days and 1 day before expiry, and once when expired.
 * Each is sent once per period (flags reset when a new plan is activated).
 */
export async function runReminders(now = new Date()) {
  const day = 86_400_000;
  const settings = await getPlanSettings();
  const sent = { d7: 0, d1: 0, expired: 0 };
  const mechanics = await Mechanic.find({ subscriptionEndsAt: mongoose.trusted({ $ne: null }) });

  for (const m of mechanics) {
    const left = m.subscriptionEndsAt.getTime() - now.getTime();
    const flags = { ...(m.subscriptionReminders?.toObject?.() ?? m.subscriptionReminders ?? {}) };
    let message = null;
    if (left <= 0 && !flags.expired) {
      flags.expired = now;
      message = {
        title: "Your plan has expired – your garage is hidden from the map",
        body: `Renew now with ${settings.renewalDiscountPercent}% off as a returning customer.`,
      };
      sent.expired++;
    } else if (left > 0 && left <= day && !flags.d1) {
      flags.d1 = now;
      flags.d7 = flags.d7 ?? now;
      message = { title: "Your plan ends tomorrow", body: `You can renew with ${settings.renewalDiscountPercent}% off as soon as it ends.` };
      sent.d1++;
    } else if (left > day && left <= 7 * day && !flags.d7) {
      flags.d7 = now;
      message = { title: `Your plan ends in ${Math.ceil(left / day)} days`, body: `When it ends, renew with ${settings.renewalDiscountPercent}% off to stay on the map.` };
      sent.d7++;
    }
    if (message) {
      m.subscriptionReminders = flags;
      await m.save();
      await notify({ recipient: m._id, role: "mechanic", type: "subscription", link: "/mechanic?tab=subscription", ...message });
    }
  }
  return sent;
}
