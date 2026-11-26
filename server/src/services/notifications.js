// Creates notifications and pushes them in real time over Server-Sent Events.
// Subscribers are kept in memory (one server instance is enough for this project).
import { Notification } from "../models/Notification.js";
import { vehicleLabel } from "../models/vehicle.js";

const subscribers = new Map(); // "role:id" -> Set<res>
const key = (role, id) => `${role}:${id}`;

export function subscribe(role, id, res) {
  const k = key(role, id);
  if (!subscribers.has(k)) subscribers.set(k, new Set());
  subscribers.get(k).add(res);
  return () => {
    const set = subscribers.get(k);
    set?.delete(res);
    if (set && set.size === 0) subscribers.delete(k);
  };
}

export function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function publish(role, id, event, data) {
  for (const res of subscribers.get(key(role, id)) ?? []) sendEvent(res, event, data);
}

/** Save a notification and push it to the recipient if they are online. Never throws. */
export async function notify({ recipient, role, type, title, body, link, order }) {
  try {
    const n = await Notification.create({ recipient, recipientRole: role, type, title, body, link, order });
    publish(role, recipient.toString(), "notification", n.toJSON());
    return n;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}

const list = (services) => services.map((s) => s.serviceName).join(", ");

/** Notifications for order lifecycle events. `order` must have user + mechanic populated. */
export const orderEvents = {
  created(order) {
    return notify({
      recipient: order.mechanic._id,
      role: "mechanic",
      type: "order_new",
      title: `New order from ${order.user.username}`,
      body: `${order.vehicle ? vehicleLabel(order.vehicle) + " – " : ""}${list(order.services)} · ৳${order.totalPrice.toLocaleString("en-US")}`,
      link: "/mechanic",
      order: order._id,
    });
  },

  statusChanged(order, by) {
    const tasks = [];
    const toUser = (type, title, body) =>
      tasks.push(notify({ recipient: order.user._id, role: "user", type, title, body, link: "/account", order: order._id }));
    const toMechanic = (type, title, body) =>
      tasks.push(notify({ recipient: order.mechanic._id, role: "mechanic", type, title, body, link: "/mechanic", order: order._id }));

    switch (order.status) {
      case "accepted":
        toUser("order_accepted", `${order.shopname} accepted your order`, "You can now call the mechanic – their number is in your orders.");
        break;
      case "completed":
        toUser("order_completed", `Job completed by ${order.shopname}`, "Thanks for using My Mechanic. Drive safe!");
        break;
      case "cancelled":
        if (by !== "user") toUser("order_cancelled", `${order.shopname} declined your order`, "Try another mechanic nearby on the map.");
        if (by !== "mechanic") toMechanic("order_cancelled", `${order.user.username} cancelled an order`, list(order.services));
        break;
      default:
        if (by === "admin") {
          toUser("order_updated", "Your order was updated", `Status: ${order.status}`);
          toMechanic("order_updated", "An order was updated by admin", `Status: ${order.status}`);
        }
    }
    return Promise.all(tasks);
  },
};
