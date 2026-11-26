// Request validation schemas (Zod). Every route validates its body / params / query with these
// before touching the database. Unknown fields are stripped, types are enforced, lengths capped.
import { z } from "zod";
import { VEHICLE_TYPES } from "../models/vehicle.js";
import { ORDER_STATUSES } from "../models/Order.js";

/* ---------- building blocks ---------- */
const emptyToUndefined = (v) => (v === "" || v === null ? undefined : v);
const trimmed = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const objectId = (label = "id") => z.string({ error: `Invalid ${label}` }).regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

export const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Please enter a valid email"));

export const phone = z
  .string({ error: "Phone number is required" })
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Please enter a valid phone number");

/** 8–72 chars (bcrypt only uses the first 72 bytes), at least one letter and one number. */
export const password = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const loginPassword = z.string({ error: "Password is required" }).min(1, "Password is required").max(200);

const name = trimmed(3, 50, "Name");
const nid = z.string({ error: "NID number is required" }).trim().regex(/^[0-9]{10,17}$/, "NID must be 10 to 17 digits");
const shopname = trimmed(3, 100, "Shop name");
const address = z.preprocess(emptyToUndefined, z.string().trim().max(200, "Address is too long").optional());
const latitude = z.coerce.number({ error: "Latitude must be a number" }).min(-90).max(90);
const longitude = z.coerce.number({ error: "Longitude must be a number" }).min(-180).max(180);

const service = z.object({
  _id: objectId("service id").optional(),
  serviceName: trimmed(1, 80, "Service name"),
  price: z.coerce.number({ error: "Price must be a number" }).min(0, "Price can't be negative").max(10_000_000, "Price is too high"),
});
const services = z.array(service).max(50, "At most 50 services");

const vehicleTypes = z
  .array(z.enum(VEHICLE_TYPES, { error: "Invalid car type" }))
  .min(1, "Select at least one car type you service")
  .max(VEHICLE_TYPES.length)
  .transform((list) => [...new Set(list)]);

export const vehicle = z.object(
  {
    type: z.enum(VEHICLE_TYPES, { error: "Choose a valid car type" }),
    make: trimmed(1, 40, "Car make"),
    model: z
      .string({ error: "Car model is required (e.g. Axio)" })
      .trim()
      .min(1, "Car model is required (e.g. Axio)")
      .max(60, "Car model is too long"),
    year: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "Year must be a number" })
        .int()
        .min(1960, "Year looks too old")
        .max(new Date().getFullYear() + 1, "Year can't be in the future")
        .optional()
    ),
    plate: z.preprocess(emptyToUndefined, z.string().trim().max(24, "Number plate is too long").optional()),
  },
  { error: "Tell us which car needs service" }
);
const vehicles = z.array(vehicle).max(5, "You can save up to 5 cars");

/* ---------- params / query ---------- */
export const idParams = z.object({ id: objectId() });
export const roleParams = z.object({ role: z.enum(["user", "mechanic", "admin"], { error: "Not found" }) });
export const registerRoleParams = z.object({ role: z.enum(["user", "mechanic"], { error: "Not found" }) });

export const mechanicsQuery = z.object({
  q: z.string().trim().max(80, "Search text is too long").optional(),
  vehicleType: z.string().max(40).optional(), // unknown values are ignored by the route
});
export const ordersQuery = z.object({ status: z.string().max(20).optional() });

/* ---------- auth ---------- */
export const login = z.object({ email, password: loginPassword });

export const registerUser = z.object({ username: name, email, phone, password });
export const registerMechanic = z.object({
  username: name,
  email,
  phone,
  password,
  nid,
  shopname,
  address,
  latitude,
  longitude,
  services: services.optional(),
  vehicleTypes: vehicleTypes.optional(),
});

const passwordChange = {
  currentPassword: z.string().max(200).optional(),
  newPassword: password.optional(),
};
export const updateMe = {
  user: z.object({ username: name.optional(), phone: phone.optional(), vehicles: vehicles.optional(), ...passwordChange }),
  mechanic: z.object({
    username: name.optional(),
    phone: phone.optional(),
    shopname: shopname.optional(),
    address,
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    services: services.optional(),
    vehicleTypes: vehicleTypes.optional(),
    ...passwordChange,
  }),
  admin: z.object({ username: name.optional(), ...passwordChange }),
};

/* ---------- orders / messages / notifications ---------- */
const geoPoint = z.object({
  latitude: z.number({ error: "Latitude must be a number" }).min(-90).max(90),
  longitude: z.number({ error: "Longitude must be a number" }).min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
});

/** Customer live location update: either a position, or { share: false } to stop sharing. */
export const locationUpdate = z.union([
  z.object({ share: z.literal(false) }),
  geoPoint.extend({ share: z.literal(true).optional() }),
]);

export const createOrder = z.object({
  shareLocation: z.boolean().optional(),
  location: geoPoint.optional(),
  mechanicId: objectId("shop"),
  serviceIds: z.array(objectId("service")).min(1, "Choose at least one service").max(50),
  vehicle,
  saveVehicle: z.boolean().optional(),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Note is too long (max 500 characters)").optional()),
});
export const orderStatus = z.object({ status: z.enum(ORDER_STATUSES, { error: "Invalid status" }) });

export const contactMessage = z.object({
  email,
  subject: trimmed(1, 150, "Subject"),
  message: trimmed(1, 3000, "Message"),
});

/* ---------- admin ---------- */
export const adminUserCreate = z.object({ username: name, email, phone, password, vehicles: vehicles.optional() });
export const adminUserUpdate = z.object({
  username: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  vehicles: vehicles.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
export const adminMechanicCreate = registerMechanic;
export const adminMechanicUpdate = z.object({
  username: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  nid: nid.optional(),
  shopname: shopname.optional(),
  address,
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  services: services.optional(),
  vehicleTypes: vehicleTypes.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
export const adminAdminCreate = z.object({ username: name, email, password });
export const adminAdminUpdate = z.object({
  username: name.optional(),
  email: email.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
});
